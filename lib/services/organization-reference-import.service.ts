import "server-only";

import { randomUUID } from "node:crypto";
import {
  AuditAction,
  Prisma,
  type Department,
  type Division,
  type Office,
  type Position,
  type Unit,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { OrganizationImportData } from "@/lib/organization-import/contract";

type ImportClient = Prisma.TransactionClient | typeof prisma;

type CurrentRecords = {
  offices: Office[];
  departments: Department[];
  divisions: Division[];
  units: Unit[];
  positions: Position[];
};

export type OrganizationImportSummary = {
  submitted: number;
  creates: number;
  updates: number;
  unchanged: number;
  activations: number;
  deactivations: number;
};

export type OrganizationDatabaseValidation =
  | { success: true; summary: OrganizationImportSummary }
  | { success: false; errors: string[] };

async function loadCurrent(client: ImportClient): Promise<CurrentRecords> {
  const [offices, departments, divisions, units, positions] = await Promise.all([
    client.office.findMany(),
    client.department.findMany(),
    client.division.findMany(),
    client.unit.findMany(),
    client.position.findMany(),
  ]);
  return { offices, departments, divisions, units, positions };
}

function addUnique(
  map: Map<string, string>,
  key: string,
  id: string,
  label: string,
  errors: string[]
) {
  const existing = map.get(key);
  if (existing && existing !== id) errors.push(`${label} conflicts with another existing or submitted record.`);
  else map.set(key, id);
}

function tempId(entity: string, rowNumber: number) {
  return `new:${entity}:${rowNumber}`;
}

function summarize(data: OrganizationImportData, current: CurrentRecords) {
  const summary: OrganizationImportSummary = {
    submitted: 0,
    creates: 0,
    updates: 0,
    unchanged: 0,
    activations: 0,
    deactivations: 0,
  };
  const collections = [
    [data.offices, current.offices, (row: typeof data.offices[number], item: Office) =>
      row.code === item.code && row.name === item.name && row.type === item.type && row.isActive === item.isActive],
    [data.departments, current.departments, (row: typeof data.departments[number], item: Department) =>
      row.code === item.code && row.name === item.name && row.isActive === item.isActive],
    [data.divisions, current.divisions, (row: typeof data.divisions[number], item: Division) =>
      row.code === item.code && row.name === item.name && row.isActive === item.isActive],
    [data.units, current.units, (row: typeof data.units[number], item: Unit) =>
      row.code === item.code && row.name === item.name && row.isActive === item.isActive],
    [data.positions, current.positions, (row: typeof data.positions[number], item: Position) =>
      row.code === item.code && row.title === item.title && row.isActive === item.isActive],
  ] as const;

  for (const [rows, records, equal] of collections) {
    const byId = new Map(records.map((record) => [record.id, record]));
    for (const row of rows as Array<(typeof rows)[number]>) {
      summary.submitted += 1;
      if (!row.recordId) {
        summary.creates += 1;
        if (!row.isActive) summary.deactivations += 1;
        continue;
      }
      const existing = byId.get(row.recordId)!;
      if ((equal as (row: never, item: never) => boolean)(row as never, existing as never)) {
        summary.unchanged += 1;
      } else {
        summary.updates += 1;
        if (existing.isActive !== row.isActive) {
          if (row.isActive) summary.activations += 1;
          else summary.deactivations += 1;
        }
      }
    }
  }
  return summary;
}

function validateAgainstCurrent(
  data: OrganizationImportData,
  current: CurrentRecords
): OrganizationDatabaseValidation {
  const errors: string[] = [];
  const officeById = new Map(current.offices.map((item) => [item.id, item]));
  const departmentById = new Map(current.departments.map((item) => [item.id, item]));
  const divisionById = new Map(current.divisions.map((item) => [item.id, item]));
  const unitById = new Map(current.units.map((item) => [item.id, item]));
  const positionById = new Map(current.positions.map((item) => [item.id, item]));

  const ensureIds = <T extends { recordId?: string; rowNumber: number }>(
    sheet: string,
    rows: T[],
    records: Map<string, unknown>
  ) => {
    for (const row of rows) {
      if (row.recordId && !records.has(row.recordId)) {
        errors.push(`${sheet} row ${row.rowNumber}: recordId does not exist in ${sheet}.`);
      }
    }
  };
  ensureIds("Offices", data.offices, officeById);
  ensureIds("Departments", data.departments, departmentById);
  ensureIds("Divisions", data.divisions, divisionById);
  ensureIds("Units", data.units, unitById);
  ensureIds("Positions", data.positions, positionById);
  if (errors.length > 0) return { success: false, errors };

  const officeUpdates = new Map(data.offices.filter((row) => row.recordId).map((row) => [row.recordId!, row]));
  const officeCodes = new Map<string, string>();
  for (const item of current.offices) {
    const row = officeUpdates.get(item.id);
    addUnique(officeCodes, row?.code ?? item.code, item.id, `Office ${row?.code ?? item.code}`, errors);
  }
  for (const row of data.offices.filter((item) => !item.recordId)) {
    addUnique(officeCodes, row.code, tempId("office", row.rowNumber), `Offices row ${row.rowNumber} code ${row.code}`, errors);
  }

  const departmentUpdates = new Map(data.departments.filter((row) => row.recordId).map((row) => [row.recordId!, row]));
  const departmentKeys = new Map<string, string>();
  for (const item of current.departments) {
    const row = departmentUpdates.get(item.id);
    if (!item.officeId) {
      if (row) errors.push(`Departments row ${row.rowNumber}: the existing department has no office and cannot be updated by bulk import.`);
      continue;
    }
    if (row && officeCodes.get(row.officeCode) !== item.officeId) {
      errors.push(`Departments row ${row.rowNumber}: changing hierarchy is not permitted; retain the current office.`);
    }
    addUnique(departmentKeys, `${item.officeId}:${row?.code ?? item.code}`, item.id, `Department ${row?.code ?? item.code}`, errors);
  }
  for (const row of data.departments.filter((item) => !item.recordId)) {
    const officeId = officeCodes.get(row.officeCode);
    if (!officeId) errors.push(`Departments row ${row.rowNumber}: officeCode ${row.officeCode} was not found.`);
    else addUnique(departmentKeys, `${officeId}:${row.code}`, tempId("department", row.rowNumber), `Departments row ${row.rowNumber} code ${row.code}`, errors);
  }

  const divisionUpdates = new Map(data.divisions.filter((row) => row.recordId).map((row) => [row.recordId!, row]));
  const divisionKeys = new Map<string, string>();
  for (const item of current.divisions) {
    const row = divisionUpdates.get(item.id);
    const department = departmentById.get(item.departmentId)!;
    const officeId = department.officeId;
    if (row && (!officeId || officeCodes.get(row.officeCode) !== officeId || departmentKeys.get(`${officeId}:${row.departmentCode}`) !== item.departmentId)) {
      errors.push(`Divisions row ${row.rowNumber}: changing hierarchy is not permitted; retain the current office and department.`);
    }
    addUnique(divisionKeys, `${item.departmentId}:${row?.code ?? item.code}`, item.id, `Division ${row?.code ?? item.code}`, errors);
  }
  for (const row of data.divisions.filter((item) => !item.recordId)) {
    const officeId = officeCodes.get(row.officeCode);
    const departmentId = officeId ? departmentKeys.get(`${officeId}:${row.departmentCode}`) : undefined;
    if (!departmentId) errors.push(`Divisions row ${row.rowNumber}: parent office/department was not found.`);
    else addUnique(divisionKeys, `${departmentId}:${row.code}`, tempId("division", row.rowNumber), `Divisions row ${row.rowNumber} code ${row.code}`, errors);
  }

  const unitUpdates = new Map(data.units.filter((row) => row.recordId).map((row) => [row.recordId!, row]));
  const unitKeys = new Map<string, string>();
  for (const item of current.units) {
    const row = unitUpdates.get(item.id);
    if (!item.divisionId) {
      if (row) errors.push(`Units row ${row.rowNumber}: the existing unit has no division and cannot be updated by bulk import.`);
      continue;
    }
    const division = divisionById.get(item.divisionId)!;
    const department = departmentById.get(division.departmentId)!;
    const officeId = department.officeId;
    if (row && (!officeId || officeCodes.get(row.officeCode) !== officeId || departmentKeys.get(`${officeId}:${row.departmentCode}`) !== department.id || divisionKeys.get(`${department.id}:${row.divisionCode}`) !== division.id)) {
      errors.push(`Units row ${row.rowNumber}: changing hierarchy is not permitted; retain the current office, department and division.`);
    }
    addUnique(unitKeys, `${item.divisionId}:${row?.code ?? item.code}`, item.id, `Unit ${row?.code ?? item.code}`, errors);
  }
  for (const row of data.units.filter((item) => !item.recordId)) {
    const officeId = officeCodes.get(row.officeCode);
    const departmentId = officeId ? departmentKeys.get(`${officeId}:${row.departmentCode}`) : undefined;
    const divisionId = departmentId ? divisionKeys.get(`${departmentId}:${row.divisionCode}`) : undefined;
    if (!divisionId) errors.push(`Units row ${row.rowNumber}: parent office/department/division was not found.`);
    else addUnique(unitKeys, `${divisionId}:${row.code}`, tempId("unit", row.rowNumber), `Units row ${row.rowNumber} code ${row.code}`, errors);
  }

  const positionUpdates = new Map(data.positions.filter((row) => row.recordId).map((row) => [row.recordId!, row]));
  const positionCodes = new Map<string, string>();
  for (const item of current.positions) {
    const row = positionUpdates.get(item.id);
    addUnique(positionCodes, row?.code ?? item.code, item.id, `Position ${row?.code ?? item.code}`, errors);
  }
  for (const row of data.positions.filter((item) => !item.recordId)) {
    addUnique(positionCodes, row.code, tempId("position", row.rowNumber), `Positions row ${row.rowNumber} code ${row.code}`, errors);
  }

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, summary: summarize(data, current) };
}

export async function validateOrganizationImport(
  data: OrganizationImportData,
  client: ImportClient = prisma
): Promise<OrganizationDatabaseValidation> {
  return validateAgainstCurrent(data, await loadCurrent(client));
}

function temporaryCode() {
  return `W31TMP_${randomUUID().replaceAll("-", "").toUpperCase()}`;
}

export async function applyOrganizationImport(input: {
  data: OrganizationImportData;
  actorId: string;
  digest: string;
  source: "xlsx" | "csv";
}) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw<Array<{ lockResult: string }>>`
      SELECT pg_advisory_xact_lock(495446, 31)::text AS "lockResult"
    `;
    const current = await loadCurrent(transaction);
    const validation = validateAgainstCurrent(input.data, current);
    if (!validation.success) {
      throw new Error(`Import validation changed: ${validation.errors.join(" ")}`);
    }

    const auditRows: Prisma.AuditLogCreateManyInput[] = [];
    const jsonRecord = (value: unknown) =>
      JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    const audit = (entity: string, recordId: string, before: unknown, after: unknown) => {
      auditRows.push({
        actorId: input.actorId,
        action: AuditAction.APP_UPDATED,
        metadata: {
          module: "ORGANIZATION_SETUP",
          action: before ? "SETUP_RECORD_BULK_UPDATED" : "SETUP_RECORD_BULK_CREATED",
          entity,
          recordId,
          importDigest: input.digest,
          before: before ? jsonRecord(before) : null,
          after: jsonRecord(after),
        } as Prisma.InputJsonValue,
      });
    };

    const currentMaps = {
      offices: new Map(current.offices.map((item) => [item.id, item])),
      departments: new Map(current.departments.map((item) => [item.id, item])),
      divisions: new Map(current.divisions.map((item) => [item.id, item])),
      units: new Map(current.units.map((item) => [item.id, item])),
      positions: new Map(current.positions.map((item) => [item.id, item])),
    };

    for (const row of input.data.offices) if (row.recordId && currentMaps.offices.get(row.recordId)!.code !== row.code) await transaction.office.update({ where: { id: row.recordId }, data: { code: temporaryCode() } });
    for (const row of input.data.departments) if (row.recordId && currentMaps.departments.get(row.recordId)!.code !== row.code) await transaction.department.update({ where: { id: row.recordId }, data: { code: temporaryCode() } });
    for (const row of input.data.divisions) if (row.recordId && currentMaps.divisions.get(row.recordId)!.code !== row.code) await transaction.division.update({ where: { id: row.recordId }, data: { code: temporaryCode() } });
    for (const row of input.data.units) if (row.recordId && currentMaps.units.get(row.recordId)!.code !== row.code) await transaction.unit.update({ where: { id: row.recordId }, data: { code: temporaryCode() } });
    for (const row of input.data.positions) if (row.recordId && currentMaps.positions.get(row.recordId)!.code !== row.code) await transaction.position.update({ where: { id: row.recordId }, data: { code: temporaryCode() } });

    const officeCodes = new Map<string, string>();
    for (const row of input.data.offices) {
      const before = row.recordId ? currentMaps.offices.get(row.recordId)! : null;
      const record = row.recordId
        ? await transaction.office.update({ where: { id: row.recordId }, data: { code: row.code, name: row.name, type: row.type, isActive: row.isActive } })
        : await transaction.office.create({ data: { code: row.code, name: row.name, type: row.type, isActive: row.isActive } });
      officeCodes.set(record.code, record.id);
      if (!before || before.code !== record.code || before.name !== record.name || before.type !== record.type || before.isActive !== record.isActive) audit("office", record.id, before, record);
    }
    for (const item of await transaction.office.findMany()) officeCodes.set(item.code, item.id);

    const departmentKeys = new Map<string, string>();
    for (const row of input.data.departments) {
      const officeId = officeCodes.get(row.officeCode)!;
      const before = row.recordId ? currentMaps.departments.get(row.recordId)! : null;
      const record = row.recordId
        ? await transaction.department.update({ where: { id: row.recordId }, data: { code: row.code, name: row.name, isActive: row.isActive } })
        : await transaction.department.create({ data: { code: row.code, name: row.name, officeId, isActive: row.isActive } });
      departmentKeys.set(`${officeId}:${record.code}`, record.id);
      if (!before || before.code !== record.code || before.name !== record.name || before.isActive !== record.isActive) audit("department", record.id, before, record);
    }
    for (const item of await transaction.department.findMany()) if (item.officeId) departmentKeys.set(`${item.officeId}:${item.code}`, item.id);

    const divisionKeys = new Map<string, string>();
    for (const row of input.data.divisions) {
      const officeId = officeCodes.get(row.officeCode)!;
      const departmentId = departmentKeys.get(`${officeId}:${row.departmentCode}`)!;
      const before = row.recordId ? currentMaps.divisions.get(row.recordId)! : null;
      const record = row.recordId
        ? await transaction.division.update({ where: { id: row.recordId }, data: { code: row.code, name: row.name, isActive: row.isActive } })
        : await transaction.division.create({ data: { code: row.code, name: row.name, departmentId, isActive: row.isActive } });
      divisionKeys.set(`${departmentId}:${record.code}`, record.id);
      if (!before || before.code !== record.code || before.name !== record.name || before.isActive !== record.isActive) audit("division", record.id, before, record);
    }
    for (const item of await transaction.division.findMany()) divisionKeys.set(`${item.departmentId}:${item.code}`, item.id);

    for (const row of input.data.units) {
      const officeId = officeCodes.get(row.officeCode)!;
      const departmentId = departmentKeys.get(`${officeId}:${row.departmentCode}`)!;
      const divisionId = divisionKeys.get(`${departmentId}:${row.divisionCode}`)!;
      const before = row.recordId ? currentMaps.units.get(row.recordId)! : null;
      const record = row.recordId
        ? await transaction.unit.update({ where: { id: row.recordId }, data: { code: row.code, name: row.name, isActive: row.isActive } })
        : await transaction.unit.create({ data: { code: row.code, name: row.name, divisionId, isActive: row.isActive } });
      if (!before || before.code !== record.code || before.name !== record.name || before.isActive !== record.isActive) audit("unit", record.id, before, record);
    }

    for (const row of input.data.positions) {
      const before = row.recordId ? currentMaps.positions.get(row.recordId)! : null;
      const record = row.recordId
        ? await transaction.position.update({ where: { id: row.recordId }, data: { code: row.code, title: row.title, isActive: row.isActive } })
        : await transaction.position.create({ data: { code: row.code, title: row.title, isActive: row.isActive } });
      if (!before || before.code !== record.code || before.title !== record.title || before.isActive !== record.isActive) audit("position", record.id, before, record);
    }

    if (auditRows.length > 0) await transaction.auditLog.createMany({ data: auditRows });
    await transaction.auditLog.create({
      data: {
        actorId: input.actorId,
        action: AuditAction.APP_UPDATED,
        metadata: {
          module: "ORGANIZATION_SETUP",
          action: "ORGANIZATION_BULK_IMPORT_APPLIED",
          importDigest: input.digest,
          source: input.source,
          summary: validation.summary,
        },
      },
    });
    return validation.summary;
  }, { timeout: 60_000 });
}
