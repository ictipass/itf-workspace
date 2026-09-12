import "server-only";

import { createHash } from "node:crypto";
import Workbook from "@excel.js/exceljs/workbook";
import type { CellValue, Worksheet } from "@excel.js/exceljs";
import Papa from "papaparse";
import {
  ORGANIZATION_SHEET_HEADERS,
  ORGANIZATION_SHEET_NAMES,
  parseOrganizationImportSheets,
  type OrganizationImportData,
  type OrganizationSheetName,
  type RawOrganizationSheet,
} from "./contract";

export type OrganizationUploadFile = {
  name: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type OrganizationUploadResult =
  | {
      success: true;
      data: OrganizationImportData;
      digest: string;
      source: "xlsx" | "csv";
      totalRows: number;
    }
  | { success: false; errors: string[] };

const CSV_FILE_NAMES = new Map(
  ORGANIZATION_SHEET_NAMES.map((sheet) => [
    `${sheet.toLowerCase()}.csv`,
    sheet,
  ])
);

function normalizeCell(value: CellValue): string | null {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return null;
}

function workbookSheetToRaw(
  worksheet: Worksheet,
  sheetName: OrganizationSheetName,
  errors: string[]
): RawOrganizationSheet {
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  const maxColumns = Math.max(
    headerRow.cellCount,
    worksheet.columnCount,
    ORGANIZATION_SHEET_HEADERS[sheetName].length
  );

  for (let column = 1; column <= maxColumns; column += 1) {
    const normalized = normalizeCell(headerRow.getCell(column).value);
    if (normalized === null) {
      errors.push(`${sheetName} row 1: headers must be plain text.`);
      headers.push("");
    } else {
      headers.push(column === 1 ? normalized.replace(/^\uFEFF/, "") : normalized);
    }
  }

  const rows: RawOrganizationSheet["rows"] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values: Record<string, string> = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      const normalized = normalizeCell(cell.value);
      if (normalized === null) {
        errors.push(
          `${sheetName} row ${rowNumber}, ${header || `column ${index + 1}`}: formulas, hyperlinks, dates and rich content are not permitted.`
        );
        values[header] = "";
      } else {
        values[header] = normalized;
        if (normalized !== "") hasValue = true;
      }
    });

    if (hasValue) rows.push({ rowNumber, values });
  }

  return { name: sheetName, headers, rows };
}

function digestFiles(files: Array<{ name: string; bytes: Uint8Array }>) {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    const name = file.name.toLowerCase();
    hash.update(`${name.length}:${name}:${file.bytes.byteLength}:`);
    hash.update(file.bytes);
  }
  return hash.digest("hex");
}

function validateZipEnvelope(bytes: Uint8Array, configuredFileLimit: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumEocd = Math.max(0, bytes.byteLength - 65_557);
  let eocd = -1;
  for (let offset = bytes.byteLength - 22; offset >= minimumEocd; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) return "The Excel file has an invalid ZIP directory.";

  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  if (entryCount > 10_000) return "The Excel workbook contains too many ZIP entries.";
  let expandedBytes = 0;
  const expandedLimit = Math.min(configuredFileLimit * 20, 50 * 1024 * 1024);

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== 0x02014b50) {
      return "The Excel file has an invalid ZIP directory.";
    }
    expandedBytes += view.getUint32(offset + 24, true);
    if (expandedBytes > expandedLimit) {
      return "The expanded Excel workbook exceeds the safe processing limit.";
    }
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return null;
}

async function parseXlsx(
  file: OrganizationUploadFile,
  maxRowsPerSheet: number,
  maxFileBytes: number
): Promise<OrganizationUploadResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    return { success: false, errors: ["The Excel file is not a valid .xlsx workbook."] };
  }
  const zipError = validateZipEnvelope(bytes, maxFileBytes);
  if (zipError) return { success: false, errors: [zipError] };

  const binaryText = new TextDecoder("latin1").decode(bytes);
  if (/vbaProject\.bin/i.test(binaryText)) {
    return { success: false, errors: ["Macro-enabled workbooks are not permitted."] };
  }
  if (/externalLinks\//i.test(binaryText)) {
    return { success: false, errors: ["Workbooks containing external links are not permitted."] };
  }

  try {
    const workbook = new Workbook();
    await workbook.xlsx.load(bytes.slice().buffer as ArrayBuffer);
    const unexpected = workbook.worksheets
      .map((sheet) => sheet.name)
      .filter(
        (name) => !ORGANIZATION_SHEET_NAMES.includes(name as OrganizationSheetName)
      );
    if (unexpected.length > 0) {
      return {
        success: false,
        errors: [`Unexpected workbook sheet(s): ${unexpected.join(", ")}.`],
      };
    }

    const errors: string[] = [];
    const sheets = ORGANIZATION_SHEET_NAMES.flatMap((name) => {
      const sheet = workbook.getWorksheet(name);
      return sheet ? [workbookSheetToRaw(sheet, name, errors)] : [];
    });
    const parsed = parseOrganizationImportSheets(sheets, maxRowsPerSheet);
    if (!parsed.success) errors.push(...parsed.errors);
    if (errors.length > 0) return { success: false, errors };

    return {
      success: true,
      data: parsed.success ? parsed.data : neverReached(),
      digest: digestFiles([{ name: file.name, bytes }]),
      source: "xlsx",
      totalRows: parsed.success ? parsed.totalRows : 0,
    };
  } catch {
    return {
      success: false,
      errors: ["The Excel workbook could not be read. Use the downloadable template."],
    };
  }
}

function neverReached(): never {
  throw new Error("Unexpected invalid workbook state.");
}

async function parseCsvFiles(
  files: OrganizationUploadFile[],
  maxRowsPerSheet: number
): Promise<OrganizationUploadResult> {
  const errors: string[] = [];
  const supplied = new Map<string, OrganizationUploadFile>();
  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    if (!CSV_FILE_NAMES.has(lowerName)) {
      errors.push(`${file.name}: expected Offices.csv, Departments.csv, Divisions.csv, Units.csv or Positions.csv.`);
    } else if (supplied.has(lowerName)) {
      errors.push(`${file.name}: duplicate CSV file.`);
    } else {
      supplied.set(lowerName, file);
    }
  }

  const byteFiles: Array<{ name: string; bytes: Uint8Array }> = [];
  const sheets: RawOrganizationSheet[] = [];
  for (const [fileName, sheetName] of CSV_FILE_NAMES) {
    const file = supplied.get(fileName);
    if (!file) continue;
    const bytes = new Uint8Array(await file.arrayBuffer());
    byteFiles.push({ name: file.name, bytes });
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
    if (result.errors.length > 0) {
      errors.push(`${file.name}: invalid CSV at row ${result.errors[0].row ?? "unknown"}.`);
      continue;
    }
    const [rawHeaders = [], ...rawRows] = result.data;
    const headers = rawHeaders.map((value, index) =>
      String(value).trim().replace(index === 0 ? /^\uFEFF/ : /$^/, "")
    );
    const rows = rawRows.map((row, index) => {
      if (row.slice(headers.length).some((value) => String(value).trim() !== "")) {
        errors.push(`${file.name} row ${index + 2}: values exist beyond the declared columns.`);
      }
      return {
        rowNumber: index + 2,
        values: Object.fromEntries(
          headers.map((header, column) => [header, String(row[column] ?? "").trim()])
        ),
      };
    });
    sheets.push({ name: sheetName, headers, rows });
  }

  const parsed = parseOrganizationImportSheets(sheets, maxRowsPerSheet);
  if (!parsed.success) errors.push(...parsed.errors);
  if (errors.length > 0) return { success: false, errors };

  return {
    success: true,
    data: parsed.success ? parsed.data : neverReached(),
    digest: digestFiles(byteFiles),
    source: "csv",
    totalRows: parsed.success ? parsed.totalRows : 0,
  };
}

export async function parseOrganizationUpload(
  files: OrganizationUploadFile[],
  limits: { maxFileBytes: number; maxRowsPerSheet: number }
): Promise<OrganizationUploadResult> {
  if (files.length === 0) {
    return { success: false, errors: ["Select one .xlsx workbook or all five CSV files."] };
  }
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > limits.maxFileBytes) {
    return {
      success: false,
      errors: [`Upload size exceeds the configured ${limits.maxFileBytes}-byte limit.`],
    };
  }

  const xlsxFiles = files.filter((file) => file.name.toLowerCase().endsWith(".xlsx"));
  const csvFiles = files.filter((file) => file.name.toLowerCase().endsWith(".csv"));
  if (xlsxFiles.length === 1 && files.length === 1) {
    return parseXlsx(xlsxFiles[0], limits.maxRowsPerSheet, limits.maxFileBytes);
  }
  if (csvFiles.length === files.length) {
    return parseCsvFiles(csvFiles, limits.maxRowsPerSheet);
  }
  return {
    success: false,
    errors: ["Use one .xlsx workbook or exactly five CSV files; do not mix formats."],
  };
}

export type WorkbookExportData = {
  offices: Array<{ id?: string; code: string; name: string; type: string; isActive: boolean }>;
  departments: Array<{ id?: string; code: string; name: string; officeCode: string; isActive: boolean }>;
  divisions: Array<{ id?: string; code: string; name: string; officeCode: string; departmentCode: string; isActive: boolean }>;
  units: Array<{ id?: string; code: string; name: string; officeCode: string; departmentCode: string; divisionCode: string; isActive: boolean }>;
  positions: Array<{ id?: string; code: string; title: string; isActive: boolean }>;
};

export async function createOrganizationWorkbook(data: WorkbookExportData) {
  const workbook = new Workbook();
  workbook.creator = "ITF Workspace";
  workbook.created = new Date();
  const collections: Record<OrganizationSheetName, Array<Record<string, unknown>>> = {
    Offices: data.offices,
    Departments: data.departments,
    Divisions: data.divisions,
    Units: data.units,
    Positions: data.positions,
  };

  for (const sheetName of ORGANIZATION_SHEET_NAMES) {
    const sheet = workbook.addWorksheet(sheetName);
    const headers = ORGANIZATION_SHEET_HEADERS[sheetName];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    for (const item of collections[sheetName]) {
      sheet.addRow(
        headers.map((header) => {
          if (header === "recordId") return item.id ?? "";
          return item[header] ?? "";
        })
      );
    }
    sheet.columns.forEach((column) => {
      column.width = 24;
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
