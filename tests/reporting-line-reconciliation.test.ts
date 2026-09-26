import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { reportingLineChangeSchema, reportingLineCreatesCycle } from "../lib/policies/reporting-line-reconciliation";

test("reporting-line correction validates HR evidence and a meaningful reason", () => {
  const valid = { userId: "user-a", expectedSupervisorId: "NONE", supervisorStaffNumber: "ITF00100", sourceReference: "HR/2026/104", reason: "Approved correction to the reporting line." };
  assert.equal(reportingLineChangeSchema.safeParse(valid).success, true);
  assert.equal(reportingLineChangeSchema.safeParse({ ...valid, sourceReference: "" }).success, false);
  assert.equal(reportingLineChangeSchema.safeParse({ ...valid, reason: "short" }).success, false);
});

test("reporting-line correction rejects self supervision and indirect cycles", () => {
  const links = new Map<string, string | null>([["a", null], ["b", "a"], ["c", "b"]]);
  assert.equal(reportingLineCreatesCycle({ targetUserId: "a", proposedSupervisorId: "a", supervisorByUserId: links }), true);
  assert.equal(reportingLineCreatesCycle({ targetUserId: "a", proposedSupervisorId: "c", supervisorByUserId: links }), true);
  assert.equal(reportingLineCreatesCycle({ targetUserId: "c", proposedSupervisorId: "a", supervisorByUserId: links }), false);
  assert.equal(reportingLineCreatesCycle({ targetUserId: "c", proposedSupervisorId: null, supervisorByUserId: links }), false);
});

test("reporting-line mutation is privileged, fresh-MFA protected, stale-safe and audited", async () => {
  const action = await readFile(new URL("../app/dashboard/admin/users/[id]/organization/actions.ts", import.meta.url), "utf8");
  assert.match(action, /WorkspaceRole\.SYSTEM_ADMIN/);
  assert.match(action, /requireFreshMfaContextOrRedirect/);
  assert.match(action, /expectedSupervisorId/);
  assert.match(action, /reportingLineCreatesCycle/);
  assert.match(action, /REPORTING_LINE_CORRECTED/);
  assert.match(action, /flowDirectorySynchronizationRequired: true/);
});
