import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { OfficeType } from "../lib/generated/prisma/enums";
import { updateSetupRecordSchema } from "../lib/policies/organization-setup";

describe("organization setup correction policy", () => {
  test("normalizes a corrected office code and accepts an office type", () => {
    const result = updateSetupRecordSchema.parse({
      entity: "office",
      id: "office-1",
      displayName: "Head Office",
      code: " hq-main ",
      officeType: OfficeType.HEADQUARTERS,
    });

    assert.equal(result.code, "HQ-MAIN");
    assert.equal(result.officeType, OfficeType.HEADQUARTERS);
  });

  test("requires a type when correcting an office", () => {
    const result = updateSetupRecordSchema.safeParse({
      entity: "office",
      id: "office-1",
      displayName: "Head Office",
      code: "HQ",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error.flatten().fieldErrors.officeType?.[0] ?? "", /required/i);
    }
  });

  test("allows non-office records without an office type", () => {
    const result = updateSetupRecordSchema.parse({
      entity: "department",
      id: "department-1",
      displayName: "Information Technology",
      code: "ict",
      officeId: "office-1",
    });

    assert.equal(result.code, "ICT");
    assert.equal(result.officeType, undefined);
  });

  test("rejects unsafe or ambiguous reference-code characters", () => {
    const result = updateSetupRecordSchema.safeParse({
      entity: "position",
      id: "position-1",
      displayName: "Service Officer",
      code: "SERVICE OFFICER/1",
    });

    assert.equal(result.success, false);
  });

  test("requires the applicable parent when correcting hierarchy records", () => {
    const department = updateSetupRecordSchema.safeParse({
      entity: "department",
      id: "department-1",
      displayName: "Information Technology",
      code: "ICT",
    });
    assert.equal(department.success, false);
    if (!department.success) {
      assert.match(
        department.error.flatten().fieldErrors.officeId?.[0] ?? "",
        /parent selection/i
      );
    }

    const division = updateSetupRecordSchema.parse({
      entity: "division",
      id: "division-1",
      displayName: "Applications Development",
      code: "APPDEV",
      departmentId: "department-2",
      confirmHierarchyMove: "yes",
    });
    assert.equal(division.departmentId, "department-2");
    assert.equal(division.confirmHierarchyMove, "yes");
  });

  test("persists parent corrections and their before-and-after audit IDs", async () => {
    const source = await import("node:fs/promises").then(({ readFile }) =>
      readFile(
        new URL("../app/dashboard/admin/setup/actions.ts", import.meta.url),
        "utf8"
      )
    );
    assert.match(source, /data: \{ name: displayName, code, officeId: targetOffice\.id \}/);
    assert.match(source, /data: \{ name: displayName, code, departmentId: targetDepartment\.id \}/);
    assert.match(source, /data: \{ name: displayName, code, divisionId: targetDivision\.id \}/);
    assert.match(source, /previousParentId/);
    assert.match(source, /confirmHierarchyMove/);
  });
});
