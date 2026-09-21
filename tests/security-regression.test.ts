import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolveAuthoritativeWorkspaceUser } from "../lib/auth/authoritative-user";
import { normalizeAppLaunchUrl } from "../lib/apps/launch-url";
import { MfaRecoveryAuthorityRole, MfaRecoveryRequestStatus, UserStatus, WorkspaceRole } from "../lib/generated/prisma/client";
import { appendWorkspaceLaunchToken } from "../lib/apps/launch-url";
import { canReplaceTemporaryPassword } from "../lib/auth/credential-transition-policy";
import {
  generateMfaRecoveryCode,
  hashMfaRecoveryCode,
  normalizeMfaRecoveryCode,
} from "../lib/security/mfa-recovery-code";
import {
  assertIndependentRecoveryExecutor,
  assertIndependentSecurityApprover,
  canExecuteRecovery,
  initialRecoveryStatus,
} from "../lib/auth/mfa-recovery-policy";

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
  mfaEnrollmentRequired: false,
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
      mfaEnrollmentRequired: false,
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

describe("MFA recovery codes", () => {
  test("generates user-friendly codes with at least 96 bits of randomness", () => {
    const codes = Array.from({ length: 20 }, generateMfaRecoveryCode);
    assert.equal(new Set(codes).size, codes.length);
    for (const code of codes) assert.match(code, /^(?:[A-F0-9]{4}-){5}[A-F0-9]{4}$/);
  });

  test("normalizes separators but binds stored hashes to the user", () => {
    const code = "ABCD-1234-EF56-7890-ABCD-1234";
    assert.equal(normalizeMfaRecoveryCode(code.toLowerCase()), "ABCD1234EF567890ABCD1234");
    assert.equal(hashMfaRecoveryCode("user-1", code), hashMfaRecoveryCode("user-1", code.replaceAll("-", " ")));
    assert.notEqual(hashMfaRecoveryCode("user-1", code), hashMfaRecoveryCode("user-2", code));
  });
});

describe("D43 recovery responsibility policy", () => {
  test("ordinary recovery skips security approval while privileged recovery requires it", () => {
    assert.equal(initialRecoveryStatus(WorkspaceRole.STAFF), MfaRecoveryRequestStatus.APPROVED);
    assert.equal(initialRecoveryStatus(WorkspaceRole.APP_ADMIN), MfaRecoveryRequestStatus.PENDING_SECURITY_APPROVAL);
    assert.equal(initialRecoveryStatus(WorkspaceRole.SYSTEM_ADMIN), MfaRecoveryRequestStatus.PENDING_SECURITY_APPROVAL);
  });

  test("rejects self-approval and actor overlap", () => {
    assert.throws(() => assertIndependentSecurityApprover({ actorId: "target", targetUserId: "target", identityVerifierId: "hr" }), /independent/);
    assert.throws(() => assertIndependentSecurityApprover({ actorId: "hr", targetUserId: "target", identityVerifierId: "hr" }), /independent/);
    assert.throws(() => assertIndependentRecoveryExecutor({ actorId: "security", targetUserId: "target", identityVerifierId: "hr", securityApproverId: "security" }), /independent/);
  });

  test("allows SYSTEM_ADMIN or the appointed sole-admin recovery operator to execute", () => {
    assert.equal(canExecuteRecovery(WorkspaceRole.SYSTEM_ADMIN), true);
    assert.equal(canExecuteRecovery(WorkspaceRole.STAFF, MfaRecoveryAuthorityRole.ICT_RECOVERY_OPERATOR), true);
    assert.equal(canExecuteRecovery(WorkspaceRole.STAFF, MfaRecoveryAuthorityRole.HR_IDENTITY_VERIFIER), false);
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
