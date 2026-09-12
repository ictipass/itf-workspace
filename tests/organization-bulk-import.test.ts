import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import Workbook from "@excel.js/exceljs/workbook";

import {
  ORGANIZATION_SHEET_HEADERS,
  ORGANIZATION_SHEET_NAMES,
  parseOrganizationImportSheets,
  type RawOrganizationSheet,
} from "../lib/organization-import/contract";
import { resolveWorkspaceOrganizationImportConfiguration } from "../lib/config/workspace-environment";
import {
  issueOrganizationImportReceipt,
  verifyOrganizationImportReceipt,
} from "../lib/organization-import/validation-receipt-core";

function sheets(overrides: Partial<Record<(typeof ORGANIZATION_SHEET_NAMES)[number], Array<Record<string, string>>>> = {}) {
  return ORGANIZATION_SHEET_NAMES.map((name): RawOrganizationSheet => ({
    name,
    headers: [...ORGANIZATION_SHEET_HEADERS[name]],
    rows: (overrides[name] ?? []).map((values, index) => ({ rowNumber: index + 2, values })),
  }));
}

describe("organization bulk-import contract", () => {
  test("loads the maintained Excel workbook runtime through its ESM subpath", () => {
    assert.equal(typeof Workbook, "function");
    const workbook = new Workbook();
    assert.equal(workbook.addWorksheet("Offices").name, "Offices");
  });

  test("accepts the five-sheet hierarchy and normalizes reference codes", () => {
    const result = parseOrganizationImportSheets(
      sheets({
        Offices: [{ recordId: "", code: "hq", name: "Headquarters", type: "HEADQUARTERS", isActive: "true" }],
        Departments: [{ recordId: "", code: "ict", name: "Information Technology", officeCode: "hq", isActive: "true" }],
        Divisions: [{ recordId: "", code: "apps", name: "Applications", officeCode: "hq", departmentCode: "ict", isActive: "true" }],
        Units: [{ recordId: "", code: "dev", name: "Development", officeCode: "hq", departmentCode: "ict", divisionCode: "apps", isActive: "true" }],
        Positions: [{ recordId: "", code: "officer", title: "IT Officer", isActive: "true" }],
      }),
      100
    );
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.totalRows, 5);
      assert.equal(result.data.units[0].officeCode, "HQ");
      assert.equal(result.data.positions[0].code, "OFFICER");
    }
  });

  test("rejects duplicate scoped codes and non-explicit active states", () => {
    const result = parseOrganizationImportSheets(
      sheets({
        Offices: [
          { recordId: "", code: "HQ", name: "Headquarters", type: "HEADQUARTERS", isActive: "yes" },
          { recordId: "", code: "HQ", name: "Other Headquarters", type: "HEADQUARTERS", isActive: "true" },
        ],
      }),
      100
    );
    assert.equal(result.success, false);
    if (!result.success) assert.match(result.errors.join(" "), /true or false|duplicates/i);
  });

  test("requires every exact sheet and enforces the row ceiling", () => {
    const missing = parseOrganizationImportSheets(sheets().slice(0, 4), 100);
    assert.equal(missing.success, false);
    if (!missing.success) assert.match(missing.errors.join(" "), /Positions.*missing/i);

    const tooMany = parseOrganizationImportSheets(
      sheets({
        Offices: [
          { recordId: "", code: "HQ", name: "Headquarters", type: "HEADQUARTERS", isActive: "true" },
          { recordId: "", code: "ZO", name: "Zonal Office", type: "ZONAL_OFFICE", isActive: "true" },
        ],
      }),
      1
    );
    assert.equal(tooMany.success, false);
    if (!tooMany.success) assert.match(tooMany.errors.join(" "), /configured limit/i);
  });

  test("uses bounded, configurable upload limits", () => {
    assert.deepEqual(resolveWorkspaceOrganizationImportConfiguration({}), {
      maxFileBytes: 5 * 1024 * 1024,
      maxRowsPerSheet: 1000,
      validationReceiptSeconds: 600,
    });
    assert.throws(
      () => resolveWorkspaceOrganizationImportConfiguration({ WORKSPACE_ORG_IMPORT_VALIDATION_RECEIPT_SECONDS: "3600" }),
      /60 to 1800/
    );
  });

  test("binds a short-lived dry-run receipt to its administrator and file digest", () => {
    const environment = {
      AUTH_SECRET: "test-secret-with-at-least-thirty-two-characters",
    };
    const now = new Date("2026-09-09T12:00:00.000Z");
    const receipt = issueOrganizationImportReceipt({
      userId: "admin-1",
      digest: "a".repeat(64),
      ttlSeconds: 600,
      now,
      environment,
    });

    assert.equal(
      verifyOrganizationImportReceipt({
        receipt,
        userId: "admin-1",
        digest: "a".repeat(64),
        now,
        environment,
      }),
      true
    );
    assert.equal(
      verifyOrganizationImportReceipt({
        receipt,
        userId: "admin-2",
        digest: "a".repeat(64),
        now,
        environment,
      }),
      false
    );
    assert.equal(
      verifyOrganizationImportReceipt({
        receipt,
        userId: "admin-1",
        digest: "b".repeat(64),
        now,
        environment,
      }),
      false
    );
    assert.equal(
      verifyOrganizationImportReceipt({
        receipt: `${receipt}x`,
        userId: "admin-1",
        digest: "a".repeat(64),
        now,
        environment,
      }),
      false
    );
    assert.equal(
      verifyOrganizationImportReceipt({
        receipt,
        userId: "admin-1",
        digest: "a".repeat(64),
        now: new Date("2026-09-09T12:10:00.000Z"),
        environment,
      }),
      false
    );
  });

  test("keeps apply behind receipt verification, fresh MFA and one transaction", async () => {
    const [action, service, receipt, workbook, nextConfig, packageJson] = await Promise.all([
      readFile(new URL("../app/dashboard/admin/setup/bulk-actions.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/services/organization-reference-import.service.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/organization-import/validation-receipt-core.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/organization-import/workbook.ts", import.meta.url), "utf8"),
      readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
    ]);
    assert.match(action, /verifyOrganizationImportReceipt/);
    assert.match(action, /requireFreshMfaContext/);
    assert.doesNotMatch(action, /export const initialOrganizationImportState/);
    assert.match(service, /prisma\.\$transaction/);
    assert.match(service, /pg_advisory_xact_lock/);
    assert.match(service, /ORGANIZATION_BULK_IMPORT_APPLIED/);
    assert.match(receipt, /createHmac\("sha256"/);
    assert.match(receipt, /timingSafeEqual/);
    assert.match(workbook, /vbaProject/);
    assert.match(workbook, /externalLinks/);
    assert.match(workbook, /expanded Excel workbook exceeds the safe processing limit/);
    assert.match(nextConfig, /bodySizeLimit: organizationImport\.maxFileBytes/);
    assert.equal(JSON.parse(packageJson).dependencies["@excel.js/exceljs"], "0.15.0");
  });
});
