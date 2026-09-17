import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { singleStaffSchema } from "../lib/policies/single-staff-onboarding";

const staff = {
  staffNumber: "00123", fullName: "Example Staff", email: "staff@example.gov.ng",
  officeCode: "HQ", departmentCode: "", divisionCode: "", unitCode: "", positionCode: "",
  supervisorStaffNumber: "", sourceReference: "HR master list reference", hrConfirmed: "on",
};
test("single staff entry preserves leading zeroes and normalizes email", () => {
  const parsed = singleStaffSchema.parse({ ...staff, email: "STAFF@example.gov.ng" });
  assert.equal(parsed.staffNumber, "00123");
  assert.equal(parsed.email, "staff@example.gov.ng");
});
test("single staff entry requires HR source and confirmation and rejects privilege injection", () => {
  for (const input of [
    { ...staff, hrConfirmed: "" }, { ...staff, sourceReference: " " }, { ...staff, email: "bad" },
    { ...staff, officeCode: "" }, { ...staff, workspaceRole: "SYSTEM_ADMIN" }, { ...staff, itfFlowRole: "SYSTEM_ADMIN" },
  ]) assert.equal(singleStaffSchema.safeParse(input).success, false);
});
test("shared creation service rejects invalid manual batches and privileged roles before database access", async () => {
  const { createWorkspaceStaff } = await import("../lib/services/workspace-user-bulk-import.service");
  const options = { importedById: "test-admin", mode: "SINGLE_USER" as const, sourceReference: "HR reference" };
  for (const rows of [[], [staff, staff], [{ ...staff, workspaceRole: "SYSTEM_ADMIN" }], [{ ...staff, workspaceRole: "APP_ADMIN" }], [{ ...staff, workspaceRole: "STAFF", staffNumber: "" }]]) {
    const result = await createWorkspaceStaff({ ...options, rows });
    assert.equal(result.success, false);
    assert.equal(result.createdCount, 0);
    assert.ok(result.errors.length > 0);
  }
  assert.equal((await createWorkspaceStaff({ ...options, sourceReference: "", rows: [staff] })).success, false);
});
test("manual creation uses the shared STAFF-only service and enforces authorization on submission", async () => {
  const action = await readFile(new URL("../app/dashboard/admin/users/new/actions.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../lib/services/workspace-user-bulk-import.service.ts", import.meta.url), "utf8");
  assert.match(action, /actor\.workspaceRole !== WorkspaceRole\.SYSTEM_ADMIN/);
  assert.match(action, /await requireFreshMfaContext\(\)/);
  assert.match(action, /workspaceRole: WorkspaceRole\.STAFF/);
  assert.match(action, /createWorkspaceStaff/);
  assert.doesNotMatch(action, /temporaryPassword|passwordHash/);
  assert.match(service, /return createWorkspaceStaff/);
  assert.match(service, /mode: params\.mode/);
  assert.match(service, /deliveryFailedCount \+= 1/);
});
