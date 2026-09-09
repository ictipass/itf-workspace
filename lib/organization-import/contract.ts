import { z } from "zod";
import { OfficeType } from "@/lib/generated/prisma/enums";
import { referenceCodeSchema } from "@/lib/policies/organization-setup";

export const ORGANIZATION_SHEET_NAMES = [
  "Offices",
  "Departments",
  "Divisions",
  "Units",
  "Positions",
] as const;

export type OrganizationSheetName = (typeof ORGANIZATION_SHEET_NAMES)[number];

export const ORGANIZATION_SHEET_HEADERS: Record<
  OrganizationSheetName,
  readonly string[]
> = {
  Offices: ["recordId", "code", "name", "type", "isActive"],
  Departments: ["recordId", "code", "name", "officeCode", "isActive"],
  Divisions: [
    "recordId",
    "code",
    "name",
    "officeCode",
    "departmentCode",
    "isActive",
  ],
  Units: [
    "recordId",
    "code",
    "name",
    "officeCode",
    "departmentCode",
    "divisionCode",
    "isActive",
  ],
  Positions: ["recordId", "code", "title", "isActive"],
};

export type RawOrganizationRow = {
  rowNumber: number;
  values: Record<string, string>;
};

export type RawOrganizationSheet = {
  name: OrganizationSheetName;
  headers: string[];
  rows: RawOrganizationRow[];
};

type ImportRowBase = {
  rowNumber: number;
  recordId?: string;
  code: string;
  isActive: boolean;
};

export type OfficeImportRow = ImportRowBase & {
  name: string;
  type: OfficeType;
};

export type DepartmentImportRow = ImportRowBase & {
  name: string;
  officeCode: string;
};

export type DivisionImportRow = ImportRowBase & {
  name: string;
  officeCode: string;
  departmentCode: string;
};

export type UnitImportRow = ImportRowBase & {
  name: string;
  officeCode: string;
  departmentCode: string;
  divisionCode: string;
};

export type PositionImportRow = ImportRowBase & {
  title: string;
};

export type OrganizationImportData = {
  offices: OfficeImportRow[];
  departments: DepartmentImportRow[];
  divisions: DivisionImportRow[];
  units: UnitImportRow[];
  positions: PositionImportRow[];
};

export type OrganizationImportParseResult =
  | { success: true; data: OrganizationImportData; totalRows: number }
  | { success: false; errors: string[] };

const recordIdSchema = z
  .string()
  .trim()
  .max(128, "recordId must not exceed 128 characters.")
  .refine((value) => !/[\u0000-\u001f]/.test(value), "recordId contains control characters.")
  .transform((value) => value || undefined);

const nameSchema = z
  .string()
  .trim()
  .min(2, "must contain at least 2 characters")
  .max(200, "must not exceed 200 characters");

const booleanSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => value === "true" || value === "false", "must be true or false")
  .transform((value) => value === "true");

const baseSchema = z.object({
  recordId: recordIdSchema,
  code: referenceCodeSchema,
  isActive: booleanSchema,
});

const officeSchema = baseSchema.extend({
  name: nameSchema,
  type: z.nativeEnum(OfficeType),
});

const departmentSchema = baseSchema.extend({
  name: nameSchema,
  officeCode: referenceCodeSchema,
});

const divisionSchema = departmentSchema.extend({
  departmentCode: referenceCodeSchema,
});

const unitSchema = divisionSchema.extend({
  divisionCode: referenceCodeSchema,
});

const positionSchema = baseSchema.extend({ title: nameSchema });

function validateHeaders(sheet: RawOrganizationSheet, errors: string[]) {
  const expected = ORGANIZATION_SHEET_HEADERS[sheet.name];
  const missing = expected.filter((header) => !sheet.headers.includes(header));
  const unexpected = sheet.headers.filter((header) => !expected.includes(header));

  if (missing.length > 0) {
    errors.push(`${sheet.name}: missing required column(s): ${missing.join(", ")}.`);
  }
  if (unexpected.length > 0) {
    errors.push(`${sheet.name}: unexpected column(s): ${unexpected.join(", ")}.`);
  }
}

function parseRows<T extends object>(
  sheet: RawOrganizationSheet,
  schema: z.ZodType<T>,
  errors: string[]
): Array<T & { rowNumber: number }> {
  const parsedRows: Array<T & { rowNumber: number }> = [];
  for (const row of sheet.rows) {
    const parsed = schema.safeParse(row.values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path.join(".") || "row";
        errors.push(`${sheet.name} row ${row.rowNumber}, ${field}: ${issue.message}.`);
      }
      continue;
    }
    parsedRows.push({ ...parsed.data, rowNumber: row.rowNumber });
  }
  return parsedRows;
}

function findDuplicateValues<
  T extends { rowNumber: number; recordId?: string; code: string },
>(
  sheet: OrganizationSheetName,
  rows: T[],
  keyFor: (row: T) => string,
  errors: string[]
) {
  const recordIds = new Map<string, number>();
  const codes = new Map<string, number>();
  for (const row of rows) {
    if (row.recordId) {
      const previous = recordIds.get(row.recordId);
      if (previous) {
        errors.push(`${sheet} row ${row.rowNumber}: recordId duplicates row ${previous}.`);
      } else {
        recordIds.set(row.recordId, row.rowNumber);
      }
    }
    const key = keyFor(row);
    const previous = codes.get(key);
    if (previous) {
      errors.push(`${sheet} row ${row.rowNumber}: code scope duplicates row ${previous}.`);
    } else {
      codes.set(key, row.rowNumber);
    }
  }
}

export function parseOrganizationImportSheets(
  sheets: RawOrganizationSheet[],
  maxRowsPerSheet: number
): OrganizationImportParseResult {
  const errors: string[] = [];
  const sheetMap = new Map(sheets.map((sheet) => [sheet.name, sheet]));

  for (const name of ORGANIZATION_SHEET_NAMES) {
    const sheet = sheetMap.get(name);
    if (!sheet) {
      errors.push(`${name}: required sheet or CSV file is missing.`);
      continue;
    }
    validateHeaders(sheet, errors);
    if (sheet.rows.length > maxRowsPerSheet) {
      errors.push(
        `${name}: ${sheet.rows.length} rows exceeds the configured limit of ${maxRowsPerSheet}.`
      );
    }
  }

  if (errors.length > 0) return { success: false, errors };

  const offices = parseRows(sheetMap.get("Offices")!, officeSchema, errors);
  const departments = parseRows(
    sheetMap.get("Departments")!,
    departmentSchema,
    errors
  );
  const divisions = parseRows(sheetMap.get("Divisions")!, divisionSchema, errors);
  const units = parseRows(sheetMap.get("Units")!, unitSchema, errors);
  const positions = parseRows(sheetMap.get("Positions")!, positionSchema, errors);

  findDuplicateValues("Offices", offices, (row) => row.code, errors);
  findDuplicateValues(
    "Departments",
    departments,
    (row) => `${String(row.officeCode)}:${row.code}`,
    errors
  );
  findDuplicateValues(
    "Divisions",
    divisions,
    (row) => `${String(row.officeCode)}:${String(row.departmentCode)}:${row.code}`,
    errors
  );
  findDuplicateValues(
    "Units",
    units,
    (row) =>
      `${String(row.officeCode)}:${String(row.departmentCode)}:${String(row.divisionCode)}:${row.code}`,
    errors
  );
  findDuplicateValues("Positions", positions, (row) => row.code, errors);

  const totalRows =
    offices.length + departments.length + divisions.length + units.length + positions.length;
  if (totalRows === 0) errors.push("The import contains no organization records.");

  return errors.length > 0
    ? { success: false, errors }
    : {
        success: true,
        data: { offices, departments, divisions, units, positions },
        totalRows,
      };
}
