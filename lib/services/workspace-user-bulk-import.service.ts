import Papa from "papaparse";
import bcrypt from "bcryptjs";
import {
  AuditAction,
  Department,
  Division,
  Office,
  Position,
  Unit,
  UserStatus,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { generateTemporaryPassword } from "@/lib/security/password";
import { writeDevCreatedUsersLog } from "@/lib/dev/dev-created-users-log";
import { sendWorkspaceWelcomeEmail } from "@/lib/email/send-workspace-welcome-email";

type CsvRow = {
  staffNumber?: string;
  fullName?: string;
  email?: string;
  workspaceRole?: string;
  officeCode?: string;
  departmentCode?: string;
  divisionCode?: string;
  unitCode?: string;
  positionCode?: string;
  supervisorStaffNumber?: string;
  itfFlowRole?: string;
};

export type BulkImportResult = {
  success: boolean;
  createdCount: number;
  validatedCount?: number;
  dryRun?: boolean;
  errors: string[];
  devLogPath?: string;
};

const REQUIRED_HEADERS = [
  "staffNumber",
  "fullName",
  "email",
  "workspaceRole",
  "officeCode",
  "departmentCode",
  "divisionCode",
  "unitCode",
  "positionCode",
  "supervisorStaffNumber",
  "itfFlowRole",
];

const ITF_FLOW_ROLES = new Set([
  "DG_SECRETARY",
  "DG",
  "DIRECTOR",
  "DIVISION_HEAD",
  "UNIT_HEAD",
  "OFFICER",
  "RECORDS_ADMIN",
  "SYSTEM_ADMIN",
]);

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown) {
  return normalize(value).toLowerCase();
}

function isValidWorkspaceRole(role: string): role is WorkspaceRole {
  return Object.values(WorkspaceRole).includes(role as WorkspaceRole);
}

export async function importWorkspaceUsersFromCsv(params: {
  csvText: string;
  importedById: string;
  dryRun?: boolean;
}): Promise<BulkImportResult> {
  const { csvText, importedById } = params;

  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const errors: string[] = [];

  if (parsed.errors.length > 0) {
    for (const error of parsed.errors) {
      errors.push(`CSV parse error: ${error.message}`);
    }
  }

  const headers = parsed.meta.fields ?? [];
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));

  if (missingHeaders.length > 0) {
    errors.push(`Missing required column(s): ${missingHeaders.join(", ")}`);
  }

  if (parsed.data.length === 0) {
    errors.push("CSV file contains no user rows.");
  }

  if (errors.length > 0) {
    return { success: false, createdCount: 0, errors };
  }

  const rows = parsed.data.map((row, index) => ({
    rowNumber: index + 2,
    staffNumber: normalize(row.staffNumber),
    fullName: normalize(row.fullName),
    email: normalizeEmail(row.email),
    workspaceRole: normalize(row.workspaceRole),
    officeCode: normalize(row.officeCode),
    departmentCode: normalize(row.departmentCode),
    divisionCode: normalize(row.divisionCode),
    unitCode: normalize(row.unitCode),
    positionCode: normalize(row.positionCode),
    supervisorStaffNumber: normalize(row.supervisorStaffNumber),
    itfFlowRole: normalize(row.itfFlowRole),
  }));

  const emailsInCsv = new Set<string>();
  const staffNumbersInCsv = new Set<string>();

  for (const row of rows) {
    if (!row.staffNumber) errors.push(`Row ${row.rowNumber}: staffNumber is required.`);
    if (!row.fullName) errors.push(`Row ${row.rowNumber}: fullName is required.`);
    if (!row.email) errors.push(`Row ${row.rowNumber}: email is required.`);
    if (!row.officeCode) errors.push(`Row ${row.rowNumber}: officeCode is required.`);

    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push(`Row ${row.rowNumber}: email "${row.email}" is invalid.`);
    }

    if (!row.workspaceRole) {
      errors.push(`Row ${row.rowNumber}: workspaceRole is required.`);
    } else if (!isValidWorkspaceRole(row.workspaceRole)) {
      errors.push(
        `Row ${row.rowNumber}: Invalid workspaceRole "${row.workspaceRole}". Allowed roles are ${Object.values(
          WorkspaceRole
        ).join(", ")}.`
      );
    }

    if (row.supervisorStaffNumber && row.supervisorStaffNumber === row.staffNumber) {
      errors.push(`Row ${row.rowNumber}: a user cannot supervise themselves.`);
    }

    if (row.itfFlowRole && !ITF_FLOW_ROLES.has(row.itfFlowRole)) {
      errors.push(
        `Row ${row.rowNumber}: invalid itfFlowRole "${row.itfFlowRole}".`,
      );
    }

    if (row.email) {
      if (emailsInCsv.has(row.email)) {
        errors.push(`Row ${row.rowNumber}: duplicate email "${row.email}" in CSV.`);
      }
      emailsInCsv.add(row.email);
    }

    if (row.staffNumber) {
      if (staffNumbersInCsv.has(row.staffNumber)) {
        errors.push(
          `Row ${row.rowNumber}: duplicate staffNumber "${row.staffNumber}" in CSV.`
        );
      }
      staffNumbersInCsv.add(row.staffNumber);
    }
  }

  if (errors.length > 0) {
    return { success: false, createdCount: 0, errors };
  }

  const [
    existingByEmail,
    existingByStaffNumber,
    offices,
    departments,
    divisions,
    units,
    positions,
    existingSupervisors,
    itfFlowApp,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { email: { in: rows.map((r) => r.email) } },
      select: { email: true },
    }),
    prisma.user.findMany({
      where: { staffNumber: { in: rows.map((r) => r.staffNumber) } },
      select: { staffNumber: true },
    }),
    prisma.office.findMany({ where: { isActive: true } }),
    prisma.department.findMany({ where: { isActive: true } }),
    prisma.division.findMany({ where: { isActive: true } }),
    prisma.unit.findMany({ where: { isActive: true } }),
    prisma.position.findMany({ where: { isActive: true } }),
    prisma.user.findMany({
      where: {
        staffNumber: {
          in: rows.map((row) => row.supervisorStaffNumber).filter(Boolean),
        },
      },
      select: { id: true, staffNumber: true },
    }),
    prisma.app.findUnique({ where: { slug: "itf-flow" }, select: { id: true } }),
  ]);

  const existingEmails = new Set(existingByEmail.map((u) => u.email));
  const existingStaffNumbers = new Set(
    existingByStaffNumber
      .map((u) => u.staffNumber)
      .filter(Boolean) as string[]
  );

  const officeByCode = new Map(offices.map((item) => [item.code, item]));
  const departmentByCode = groupByCode(departments);
  const divisionByCode = groupByCode(divisions);
  const unitByCode = groupByCode(units);
  const positionByCode = new Map(positions.map((item) => [item.code, item]));
  const existingSupervisorByStaffNumber = new Map(
    existingSupervisors
      .filter((item) => item.staffNumber)
      .map((item) => [item.staffNumber!, item.id]),
  );

  type ValidatedRow = {
    rowNumber: number;
    staffNumber: string;
    fullName: string;
    email: string;
    workspaceRole: WorkspaceRole;
    office: Office;
    department?: Department;
    division?: Division;
    unit?: Unit;
    position?: Position;
    temporaryPassword: string;
    supervisorStaffNumber?: string;
    itfFlowRole?: string;
  };

  const validatedRows: ValidatedRow[] = [];

  for (const row of rows) {
    if (existingEmails.has(row.email)) {
      errors.push(`Row ${row.rowNumber}: email "${row.email}" already exists.`);
    }

    if (existingStaffNumbers.has(row.staffNumber)) {
      errors.push(
        `Row ${row.rowNumber}: staffNumber "${row.staffNumber}" already exists.`
      );
    }

    const office = officeByCode.get(row.officeCode);

    if (!office) {
      errors.push(`Row ${row.rowNumber}: officeCode "${row.officeCode}" does not exist.`);
      continue;
    }

    const department = resolveOptionalByCode({
      rowNumber: row.rowNumber,
      label: "departmentCode",
      code: row.departmentCode,
      items: departmentByCode,
      errors,
    });

    const division = resolveOptionalByCode({
      rowNumber: row.rowNumber,
      label: "divisionCode",
      code: row.divisionCode,
      items: divisionByCode,
      errors,
    });

    const unit = resolveOptionalByCode({
      rowNumber: row.rowNumber,
      label: "unitCode",
      code: row.unitCode,
      items: unitByCode,
      errors,
    });

    const position = row.positionCode
      ? positionByCode.get(row.positionCode)
      : undefined;

    if (row.positionCode && !position) {
      errors.push(
        `Row ${row.rowNumber}: positionCode "${row.positionCode}" does not exist.`
      );
    }

    if (department && department.officeId !== office.id) {
      errors.push(
        `Row ${row.rowNumber}: departmentCode "${row.departmentCode}" does not belong to officeCode "${row.officeCode}".`
      );
    }

    if (division && department && division.departmentId !== department.id) {
      errors.push(
        `Row ${row.rowNumber}: divisionCode "${row.divisionCode}" does not belong to departmentCode "${row.departmentCode}".`
      );
    }

    if (unit) {
      if (unit.divisionId && division && unit.divisionId !== division.id) {
        errors.push(
          `Row ${row.rowNumber}: unitCode "${row.unitCode}" does not belong to divisionCode "${row.divisionCode}".`
        );
      }
    }

    if (
      row.supervisorStaffNumber &&
      !staffNumbersInCsv.has(row.supervisorStaffNumber) &&
      !existingSupervisorByStaffNumber.has(row.supervisorStaffNumber)
    ) {
      errors.push(
        `Row ${row.rowNumber}: supervisorStaffNumber "${row.supervisorStaffNumber}" was not found in Workspace or this import.`,
      );
    }

    if (row.itfFlowRole && !itfFlowApp) {
      errors.push(
        `Row ${row.rowNumber}: ITF Flow must be registered before assigning itfFlowRole.`,
      );
    }

    validatedRows.push({
      rowNumber: row.rowNumber,
      staffNumber: row.staffNumber,
      fullName: row.fullName,
      email: row.email,
      workspaceRole: row.workspaceRole as WorkspaceRole,
      office,
      department,
      division,
      unit,
      position,
      temporaryPassword: generateTemporaryPassword(),
      supervisorStaffNumber: row.supervisorStaffNumber || undefined,
      itfFlowRole: row.itfFlowRole || undefined,
    });
  }

  if (errors.length > 0) {
    return { success: false, createdCount: 0, errors };
  }

  if (params.dryRun) {
    return {
      success: true,
      createdCount: 0,
      validatedCount: validatedRows.length,
      dryRun: true,
      errors: [],
    };
  }

  const createdCredentials: Array<{
    staffNumber: string;
    fullName: string;
    email: string;
    workspaceRole: string;
    temporaryPassword: string;
    officeCode: string;
    departmentCode?: string | null;
    divisionCode?: string | null;
    unitCode?: string | null;
    positionCode?: string | null;
  }> = [];

  await prisma.$transaction(async (tx) => {
    const createdUserIdByStaffNumber = new Map<string, string>();

    for (const row of validatedRows) {
      const passwordHash = await bcrypt.hash(row.temporaryPassword, 10);

      const created = await tx.user.create({
        data: {
          staffNumber: row.staffNumber,
          fullName: row.fullName,
          email: row.email,
          workspaceRole: row.workspaceRole,
          passwordHash,
          isTemporaryPassword: true,
          status: UserStatus.ACTIVE,
          officeId: row.office.id,
          departmentId: row.department?.id,
          divisionId: row.division?.id,
          unitId: row.unit?.id,
          positionId: row.position?.id,
        },
      });
      createdUserIdByStaffNumber.set(row.staffNumber, created.id);

      createdCredentials.push({
        staffNumber: row.staffNumber,
        fullName: row.fullName,
        email: row.email,
        workspaceRole: row.workspaceRole,
        temporaryPassword: row.temporaryPassword,
        officeCode: row.office.code,
        departmentCode: row.department?.code,
        divisionCode: row.division?.code,
        unitCode: row.unit?.code,
        positionCode: row.position?.code,
      });
    }

    for (const row of validatedRows) {
      const userId = createdUserIdByStaffNumber.get(row.staffNumber)!;
      if (row.supervisorStaffNumber) {
        const supervisorId =
          createdUserIdByStaffNumber.get(row.supervisorStaffNumber) ??
          existingSupervisorByStaffNumber.get(row.supervisorStaffNumber);
        if (!supervisorId) throw new Error("Validated supervisor could not be resolved.");
        await tx.user.update({ where: { id: userId }, data: { supervisorId } });
      }

      if (row.itfFlowRole && itfFlowApp) {
        await tx.appAccess.create({
          data: {
            userId,
            appId: itfFlowApp.id,
            appRole: row.itfFlowRole,
            status: "ACTIVE",
            grantedById: importedById,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actorId: importedById,
        action: AuditAction.USER_CREATED,
        metadata: {
          mode: "BULK_IMPORT",
          createdCount: validatedRows.length,
          reportingLinesAssigned: validatedRows.filter((row) => row.supervisorStaffNumber).length,
          itfFlowEntitlementsGranted: validatedRows.filter((row) => row.itfFlowRole).length,
        },
      },
    });
  });

  let devLogPath: string | undefined;

  if (process.env.NODE_ENV === "production") {
    for (const user of createdCredentials) {
      await sendWorkspaceWelcomeEmail({
        to: user.email,
        fullName: user.fullName,
        temporaryPassword: user.temporaryPassword,
      });
    }
  } else {
    devLogPath = await writeDevCreatedUsersLog(createdCredentials);
  }

  return {
    success: true,
    createdCount: createdCredentials.length,
    errors: [],
    devLogPath,
  };
}

function groupByCode<T extends { code: string }>(items: T[]) {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const current = map.get(item.code) ?? [];
    current.push(item);
    map.set(item.code, current);
  }

  return map;
}

function resolveOptionalByCode<T extends { code: string }>(params: {
  rowNumber: number;
  label: string;
  code: string;
  items: Map<string, T[]>;
  errors: string[];
}) {
  const { rowNumber, label, code, items, errors } = params;

  if (!code) return undefined;

  const matches = items.get(code);

  if (!matches || matches.length === 0) {
    errors.push(`Row ${rowNumber}: ${label} "${code}" does not exist.`);
    return undefined;
  }

  if (matches.length > 1) {
    errors.push(
      `Row ${rowNumber}: ${label} "${code}" is ambiguous. Use unique codes or refine reference data.`
    );
    return undefined;
  }

  return matches[0];
}
