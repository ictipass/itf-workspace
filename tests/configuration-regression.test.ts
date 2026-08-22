import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  resolveItfFlowDirectorySyncConfiguration,
  resolveWorkspaceEmailConfiguration,
  resolveWorkspaceSeedConfiguration,
  validateWorkspaceRuntimeEnvironment,
  WorkspaceConfigurationError,
} from "../lib/config/workspace-environment";

const validProductionEnvironment = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://workspace:password@database.example.test/workspace",
  AUTH_SECRET: "a".repeat(40),
  AUTH_URL: "https://workspace.example.test",
  AUTH_TRUST_HOST: "true",
  WORKSPACE_LAUNCH_TOKEN_SECRET: "b".repeat(40),
  RESEND_API_KEY: `re_${"c".repeat(32)}`,
  RESEND_FROM_EMAIL: "ITF Workspace <workspace@example.test>",
  ITF_FLOW_URL: "https://flow.example.test/workspace/launch",
  WORKSPACE_DIRECTORY_SYNC_SECRET: "d".repeat(40),
};

describe("Workspace runtime configuration", () => {
  test("keeps explicit development defaults limited to development", () => {
    const configuration = validateWorkspaceRuntimeEnvironment({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://localhost/workspace",
    });

    assert.equal(configuration.mode, "development");
    assert.equal(
      configuration.launchTokenSecret,
      "development-only-workspace-launch-token-secret"
    );
    assert.equal(configuration.emailConfigured, false);
    assert.equal(configuration.itfFlowDirectorySyncConfigured, false);
  });

  test("accepts complete production configuration without exposing secrets", () => {
    const configuration = validateWorkspaceRuntimeEnvironment(
      validProductionEnvironment
    );

    assert.equal(configuration.mode, "production");
    assert.equal(configuration.authUrl, "https://workspace.example.test/");
    assert.equal(configuration.emailConfigured, true);
    assert.equal(configuration.itfFlowDirectorySyncConfigured, true);
  });

  test("reports every missing production requirement in one redacted error", () => {
    assert.throws(
      () =>
        validateWorkspaceRuntimeEnvironment(
          { NODE_ENV: "production" },
          { mode: "production" }
        ),
      (error) => {
        assert.ok(error instanceof WorkspaceConfigurationError);
        assert.match(error.message, /DATABASE_URL/);
        assert.match(error.message, /AUTH_SECRET or NEXTAUTH_SECRET/);
        assert.match(error.message, /AUTH_URL or NEXTAUTH_URL/);
        assert.match(error.message, /WORKSPACE_LAUNCH_TOKEN_SECRET/);
        assert.match(error.message, /RESEND_API_KEY/);
        assert.match(error.message, /RESEND_FROM_EMAIL/);
        return true;
      }
    );
  });

  test("rejects conflicting Auth.js aliases", () => {
    assert.throws(
      () =>
        validateWorkspaceRuntimeEnvironment({
          NODE_ENV: "development",
          DATABASE_URL: "postgresql://localhost/workspace",
          AUTH_SECRET: "one",
          NEXTAUTH_SECRET: "two",
        }),
      /AUTH_SECRET and NEXTAUTH_SECRET must match/
    );
  });

  test("rejects placeholder secrets in production", () => {
    assert.throws(
      () =>
        validateWorkspaceRuntimeEnvironment({
          ...validProductionEnvironment,
          AUTH_SECRET: "replace-with-a-random-secret-of-at-least-32-characters",
        }),
      /AUTH_SECRET contains a documented placeholder value/
    );
  });

  test("rejects non-PostgreSQL database URLs and malformed trust-host values", () => {
    assert.throws(
      () =>
        validateWorkspaceRuntimeEnvironment({
          NODE_ENV: "development",
          DATABASE_URL: "mysql://localhost/workspace",
          AUTH_TRUST_HOST: "sometimes",
        }),
      (error) => {
        assert.ok(error instanceof WorkspaceConfigurationError);
        assert.match(error.message, /DATABASE_URL must use postgresql: or postgres:/);
        assert.match(error.message, /AUTH_TRUST_HOST/);
        return true;
      }
    );
  });
});

describe("feature configuration", () => {
  test("derives the email login URL from the configured Auth.js origin", () => {
    const configuration = resolveWorkspaceEmailConfiguration({
      RESEND_API_KEY: `re_${"a".repeat(32)}`,
      RESEND_FROM_EMAIL: "workspace@example.test",
      AUTH_URL: "https://workspace.example.test/base",
    });

    assert.equal(configuration.loginUrl, "https://workspace.example.test/login");
  });

  test("requires an email key and approved sender together", () => {
    assert.throws(
      () =>
        resolveWorkspaceEmailConfiguration({
          RESEND_API_KEY: `re_${"a".repeat(32)}`,
        }),
      /RESEND_FROM_EMAIL/
    );
  });

  test("derives the ITF Flow sync endpoint and requires its secret", () => {
    const configuration = resolveItfFlowDirectorySyncConfiguration({
      ITF_FLOW_URL: "https://flow.example.test/workspace/launch",
      WORKSPACE_DIRECTORY_SYNC_SECRET: "directory-secret",
    });

    assert.equal(
      configuration.endpoint,
      "https://flow.example.test/api/integrations/workspace/directory-sync"
    );
    assert.equal(configuration.secret, "directory-secret");

    assert.throws(
      () =>
        resolveItfFlowDirectorySyncConfiguration({
          ITF_FLOW_URL: "https://flow.example.test/workspace/launch",
        }),
      /WORKSPACE_DIRECTORY_SYNC_SECRET/
    );
  });
});

describe("seed configuration", () => {
  test("retains local seed defaults outside production", () => {
    const configuration = resolveWorkspaceSeedConfiguration(
      {},
      { mode: "development" }
    );

    assert.equal(configuration.email, "admin@itf.gov.ng");
    assert.equal(configuration.staffNumber, "ITF-SYS-001");
  });

  test("removes every initial-admin default from production", () => {
    assert.throws(
      () => resolveWorkspaceSeedConfiguration({}, { mode: "production" }),
      (error) => {
        assert.ok(error instanceof WorkspaceConfigurationError);
        assert.match(error.message, /INITIAL_ADMIN_EMAIL/);
        assert.match(error.message, /INITIAL_ADMIN_PASSWORD/);
        assert.match(error.message, /INITIAL_ADMIN_NAME/);
        assert.match(error.message, /INITIAL_ADMIN_STAFF_NUMBER/);
        assert.match(error.message, /ITF_FLOW_URL/);
        assert.doesNotMatch(error.message, /Password123!/);
        return true;
      }
    );
  });
});
