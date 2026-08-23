import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolveAuthoritativeWorkspaceUser } from "../lib/auth/authoritative-user";
import { normalizeAppLaunchUrl } from "../lib/apps/launch-url";
import { UserStatus, WorkspaceRole } from "../lib/generated/prisma/client";
import { appendWorkspaceLaunchToken } from "../lib/apps/launch-url";
import { canReplaceTemporaryPassword } from "../lib/auth/credential-transition-policy";

const activeUser = {
  id: "user-1",
  fullName: "Example Staff",
  email: "staff@example.test",
  staffNumber: "ITF-001",
  workspaceRole: WorkspaceRole.STAFF,
  status: UserStatus.ACTIVE,
  isTemporaryPassword: false,
  officeId: "office-1",
  departmentId: "department-1",
  divisionId: "division-1",
  unitId: "unit-1",
  positionId: "position-1",
};


describe("authoritative current-user policy", () => {
  test("allows temporary-password replacement before privileged MFA enrollment", () => {
    assert.equal(
      canReplaceTemporaryPassword({
        isTemporaryPassword: true,
        authenticationMethods: ["pwd"],
      }),
      true
    );
    assert.equal(
      canReplaceTemporaryPassword({
        isTemporaryPassword: false,
        authenticationMethods: ["pwd", "totp"],
      }),
      false
    );
    assert.equal(
      canReplaceTemporaryPassword({
        isTemporaryPassword: true,
        authenticationMethods: ["totp"],
      }),
      false
    );
  });

  test("rejects a missing or deleted user record", () => {
    assert.equal(resolveAuthoritativeWorkspaceUser(null), null);
  });

  for (const status of [UserStatus.INACTIVE, UserStatus.SUSPENDED]) {
    test(`rejects a ${status.toLowerCase()} user`, () => {
      assert.equal(
        resolveAuthoritativeWorkspaceUser({ ...activeUser, status }),
        null
      );
    });
  }

  test("returns current directory attributes for an active user", () => {
    assert.deepEqual(resolveAuthoritativeWorkspaceUser(activeUser), {
      id: activeUser.id,
      name: activeUser.fullName,
      email: activeUser.email,
      staffNumber: activeUser.staffNumber,
      workspaceRole: WorkspaceRole.STAFF,
      status: UserStatus.ACTIVE,
      isTemporaryPassword: false,
      officeId: activeUser.officeId,
      departmentId: activeUser.departmentId,
      divisionId: activeUser.divisionId,
      unitId: activeUser.unitId,
      positionId: activeUser.positionId,
      totpEnrolledAt: undefined,
    });
  });

  test("uses the current role after promotion or demotion", () => {
    for (const workspaceRole of [
      WorkspaceRole.STAFF,
      WorkspaceRole.APP_ADMIN,
      WorkspaceRole.SYSTEM_ADMIN,
    ]) {
      assert.equal(
        resolveAuthoritativeWorkspaceUser({ ...activeUser, workspaceRole })
          ?.workspaceRole,
        workspaceRole
      );
    }
  });
});

describe("app launch URL handling", () => {
  test("normalizes a configured app URL and removes an injected token or fragment", () => {
    assert.equal(
      normalizeAppLaunchUrl(
        " FLOW.EXAMPLE.TEST/path///?mode=staff&workspace_launch_token=attacker#fragment "
      ),
      "https://flow.example.test/path?mode=staff"
    );
  });

  test("rejects a non-HTTP app URL", () => {
    assert.throws(
      () => normalizeAppLaunchUrl("ftp://flow.example.test"),
      /http or https/
    );
  });

  test("appends the launch token without dropping configured query values", () => {
    assert.equal(
      appendWorkspaceLaunchToken("https://flow.example.test/start?mode=staff", "signed-token"),
      "https://flow.example.test/start?mode=staff&workspace_launch_token=signed-token"
    );
  });
});
