import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { resolveAuthoritativeWorkspaceUser } from "../lib/auth/authoritative-user";
import { normalizeAppLaunchUrl } from "../lib/apps/launch-url";
import { UserStatus, WorkspaceRole } from "../lib/generated/prisma/client";
import {
  getWorkspaceLaunchTokenFromUrl,
  removeWorkspaceLaunchTokenFromUrl,
  verifyWorkspaceLaunchTokenForApp,
} from "../lib/integrations/workspace-launch-token-receiver";
import {
  createWorkspaceLaunchToken,
  verifyWorkspaceLaunchToken,
} from "../lib/security/sso-launch-token";

const TEST_SECRET = "w08-test-secret-with-at-least-32-characters";
const originalLaunchTokenSecret = process.env.WORKSPACE_LAUNCH_TOKEN_SECRET;

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

const launchPayload = {
  user: {
    id: activeUser.id,
    name: activeUser.fullName,
    email: activeUser.email,
    staffNumber: activeUser.staffNumber,
    workspaceRole: activeUser.workspaceRole,
    officeId: activeUser.officeId,
    departmentId: activeUser.departmentId,
    divisionId: activeUser.divisionId,
    unitId: activeUser.unitId,
    positionId: activeUser.positionId,
  },
  app: {
    id: "app-1",
    slug: "itf-flow",
    name: "ITF Flow",
    role: "STAFF",
  },
};

before(() => {
  process.env.WORKSPACE_LAUNCH_TOKEN_SECRET = TEST_SECRET;
});

after(() => {
  if (originalLaunchTokenSecret === undefined) {
    delete process.env.WORKSPACE_LAUNCH_TOKEN_SECRET;
  } else {
    process.env.WORKSPACE_LAUNCH_TOKEN_SECRET = originalLaunchTokenSecret;
  }
});

describe("authoritative current-user policy", () => {
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

describe("Workspace launch token v1 boundary", () => {
  test("issues a token that the app receiver accepts for its audience", () => {
    const { token } = createWorkspaceLaunchToken(launchPayload);
    const issuerPayload = verifyWorkspaceLaunchToken(token);
    const receiverPayload = verifyWorkspaceLaunchTokenForApp(token, {
      secret: TEST_SECRET,
      expectedAppSlug: "itf-flow",
    });

    assert.equal(receiverPayload.tokenId, issuerPayload.tokenId);
    assert.deepEqual(receiverPayload.user, launchPayload.user);
    assert.deepEqual(receiverPayload.app, launchPayload.app);
  });

  test("rejects a tampered token", () => {
    const { token } = createWorkspaceLaunchToken(launchPayload);
    const finalCharacter = token.at(-1);
    const tamperedToken = `${token.slice(0, -1)}${finalCharacter === "a" ? "b" : "a"}`;

    assert.throws(
      () =>
        verifyWorkspaceLaunchTokenForApp(tamperedToken, {
          secret: TEST_SECRET,
          expectedAppSlug: "itf-flow",
        }),
      /signature/
    );
  });

  test("rejects malformed tokens with extra segments", () => {
    const { token } = createWorkspaceLaunchToken(launchPayload);

    assert.throws(() => verifyWorkspaceLaunchToken(`${token}.extra`), /Invalid/);
    assert.throws(
      () =>
        verifyWorkspaceLaunchTokenForApp(`${token}.extra`, {
          secret: TEST_SECRET,
          expectedAppSlug: "itf-flow",
        }),
      /Invalid/
    );
  });

  test("rejects a token presented to another app", () => {
    const { token } = createWorkspaceLaunchToken(launchPayload);

    assert.throws(
      () =>
        verifyWorkspaceLaunchTokenForApp(token, {
          secret: TEST_SECRET,
          expectedAppSlug: "another-app",
        }),
      /another app/
    );
  });

  test("rejects a token at its exact expiry boundary", () => {
    const { token, expiresAt } = createWorkspaceLaunchToken(launchPayload);

    assert.throws(
      () =>
        verifyWorkspaceLaunchTokenForApp(token, {
          secret: TEST_SECRET,
          expectedAppSlug: "itf-flow",
          now: new Date(expiresAt * 1000),
        }),
      /expired/
    );
  });

  test("requires the receiver secret", () => {
    const { token } = createWorkspaceLaunchToken(launchPayload);

    assert.throws(
      () =>
        verifyWorkspaceLaunchTokenForApp(token, {
          secret: "",
          expectedAppSlug: "itf-flow",
        }),
      /secret is required/
    );
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

  test("extracts and removes a launch token without dropping other query values", () => {
    const url =
      "https://flow.example.test/start?mode=staff&workspace_launch_token=signed-token";

    assert.equal(getWorkspaceLaunchTokenFromUrl(url), "signed-token");
    assert.equal(
      removeWorkspaceLaunchTokenFromUrl(url),
      "https://flow.example.test/start?mode=staff"
    );
  });
});
