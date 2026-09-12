import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceRole } from "../lib/generated/prisma/client";
import {
  HR_MASTER_LIST_WORKSPACE_ROLE,
  isActiveClassifiedAppRole,
  isPermittedHrMasterListWorkspaceRole,
  normalizeAppRoleCode,
} from "../lib/policies/staff-onboarding";

test("HR master-list imports permit ordinary staff only", () => {
  assert.equal(HR_MASTER_LIST_WORKSPACE_ROLE, WorkspaceRole.STAFF);
  assert.equal(isPermittedHrMasterListWorkspaceRole(WorkspaceRole.STAFF), true);
  assert.equal(isPermittedHrMasterListWorkspaceRole(WorkspaceRole.APP_ADMIN), false);
  assert.equal(isPermittedHrMasterListWorkspaceRole(WorkspaceRole.SYSTEM_ADMIN), false);
});

test("HR master-list role validation is explicit and fail-closed", () => {
  assert.equal(isPermittedHrMasterListWorkspaceRole("staff"), false);
  assert.equal(isPermittedHrMasterListWorkspaceRole(""), false);
  assert.equal(isPermittedHrMasterListWorkspaceRole("UNKNOWN"), false);
});

test("child-app roles are normalized and require an exact active classification", () => {
  const policies = [
    { roleCode: "OFFICER", isActive: true },
    { roleCode: "UNIT_HEAD", isActive: false },
  ];

  assert.equal(normalizeAppRoleCode(" officer "), "OFFICER");
  assert.equal(isActiveClassifiedAppRole("officer", policies), true);
  assert.equal(isActiveClassifiedAppRole("UNIT_HEAD", policies), false);
  assert.equal(isActiveClassifiedAppRole("DIRECTOR", policies), false);
});

test("user import and Flow synchronization fail closed on unclassified roles", async () => {
  const { readFile } = await import("node:fs/promises");
  const [importService, directorySync, seed] = await Promise.all([
    readFile(
      new URL("../lib/services/workspace-user-bulk-import.service.ts", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../lib/integrations/itf-flow-directory-sync.ts", import.meta.url),
      "utf8"
    ),
    readFile(new URL("../prisma/seed.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(importService, /const ITF_FLOW_ROLES/);
  assert.match(importService, /isActiveClassifiedAppRole/);
  assert.match(importService, /is not active and classified in the app registry/);
  assert.match(directorySync, /directory synchronization blocked/);
  assert.doesNotMatch(directorySync, /appRole \|\| "OFFICER"/);
  assert.match(seed, /roleCode: "OFFICER"/);
  assert.match(seed, /AssuranceRequirement\.STANDARD/);
});
