import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceRole } from "../lib/generated/prisma/client";
import {
  HR_MASTER_LIST_WORKSPACE_ROLE,
  isPermittedHrMasterListWorkspaceRole,
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
