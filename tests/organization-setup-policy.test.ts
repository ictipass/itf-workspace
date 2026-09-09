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
});
