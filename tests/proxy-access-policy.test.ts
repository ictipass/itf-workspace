import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  isPasswordChangePath,
  isPublicWorkspacePath,
} from "../lib/auth/route-access-policy";

describe("Workspace proxy access policy", () => {
  test("allows the exact anonymous browser routes", () => {
    for (const pathname of ["/", "/login", "/session-recovery"]) {
      assert.equal(isPublicWorkspacePath(pathname), true, pathname);
    }
  });

  test("allows Auth.js endpoints and the exact public JWKS endpoint", () => {
    assert.equal(isPublicWorkspacePath("/api/auth"), true);
    assert.equal(isPublicWorkspacePath("/api/auth/session"), true);
    assert.equal(
      isPublicWorkspacePath("/api/integrations/workspace/v2/jwks"),
      true
    );
  });

  test("does not expose adjacent or privileged integration routes", () => {
    for (const pathname of [
      "/login-admin",
      "/session-recovery-export",
      "/api/authentication",
      "/api/integrations/workspace/v2/jwks/private",
      "/api/integrations/workspace/v2/launch",
      "/api/internal/integration-outbox",
    ]) {
      assert.equal(isPublicWorkspacePath(pathname), false, pathname);
    }
  });

  test("limits the temporary-password exception to its exact route", () => {
    assert.equal(isPasswordChangePath("/change-password"), true);
    assert.equal(isPasswordChangePath("/change-password/export"), false);
    assert.equal(isPasswordChangePath("/change-password-admin"), false);
  });
});
