import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  resolveItfFlowDirectorySyncConfiguration,
  resolveItfFlowSessionEventConfiguration,
  resolveWorkspaceEmailConfiguration,
  resolveWorkspaceServerActionAllowedOrigins,
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
  WORKSPACE_LAUNCH_ISSUER: "https://workspace.example.test",
  WORKSPACE_LAUNCH_SIGNER_PROVIDER: "kms",
  WORKSPACE_LAUNCH_ACTIVE_KID: "workspace-2026-08",
  WORKSPACE_LAUNCH_KMS_KEY_ID: "provider-key-reference",
  WORKSPACE_MFA_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 1).toString("base64"),
  RESEND_API_KEY: `re_${"c".repeat(32)}`,
  RESEND_FROM_EMAIL: "ITF Workspace <workspace@example.test>",
  ITF_FLOW_URL: "https://flow.example.test/workspace/launch",
  WORKSPACE_DIRECTORY_SYNC_SECRET: "d".repeat(40),
  WORKSPACE_INTEROP_SECRET: "e".repeat(40),
  WORKSPACE_OUTBOX_WORKER_SECRET: "f".repeat(40),
};

describe("Workspace runtime configuration", () => {
  test("accepts only exact additional Server Action origins", () => {
    assert.deepEqual(
      resolveWorkspaceServerActionAllowedOrigins({
        WORKSPACE_SERVER_ACTION_ALLOWED_ORIGINS:
          "localhost:3000, M011SSFN-3000.UKS1.DEVTUNNELS.MS,localhost:3000",
      }),
      ["localhost:3000", "m011ssfn-3000.uks1.devtunnels.ms"]
    );
  });

  test("rejects broad or URL-shaped Server Action origins", () => {
    for (const value of [
      "*.devtunnels.ms",
      "https://workspace.example.test",
      "workspace.example.test/login",
      "user@workspace.example.test",
    ]) {
      assert.throws(
        () =>
          resolveWorkspaceServerActionAllowedOrigins({
            WORKSPACE_SERVER_ACTION_ALLOWED_ORIGINS: value,
          }),
        /exact host\[:port\]/
      );
    }
  });

  test("keeps explicit development defaults limited to development", () => {
    const configuration = validateWorkspaceRuntimeEnvironment({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://localhost/workspace",
    });

    assert.equal(configuration.mode, "development");
    assert.equal(configuration.launchV2.signerProvider, "ephemeral");
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
    assert.equal(configuration.itfFlowSessionEventsConfigured, true);
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
        assert.match(error.message, /WORKSPACE_LAUNCH_ISSUER/);
        assert.match(error.message, /WORKSPACE_LAUNCH_SIGNER_PROVIDER/);
        assert.match(error.message, /WORKSPACE_MFA_ENCRYPTION_KEY_BASE64/);
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
    assert.equal(configuration.appSlug, "itf-flow");
    assert.equal(configuration.batchSize, 200);
    assert.equal(configuration.requestTimeoutMs, 30000);

    assert.throws(
      () =>
        resolveItfFlowDirectorySyncConfiguration({
          ITF_FLOW_URL: "https://flow.example.test/workspace/launch",
        }),
      /WORKSPACE_DIRECTORY_SYNC_SECRET/
    );
  });

  test("derives a bounded ITF Flow session-event outbox configuration", () => {
    const configuration = resolveItfFlowSessionEventConfiguration({
      ITF_FLOW_URL: "https://flow.example.test/workspace/launch",
      WORKSPACE_INTEROP_SECRET: "interoperability-secret",
      WORKSPACE_OUTBOX_BATCH_SIZE: "40",
    });
    assert.equal(
      configuration.endpoint,
      "https://flow.example.test/api/integrations/workspace/session-events"
    );
    assert.equal(configuration.appSlug, "itf-flow");
    assert.equal(configuration.batchSize, 40);
    assert.equal(configuration.maxAttempts, 10);
  });

  test("rejects incomplete or unsafe production session-event configuration", () => {
    assert.throws(
      () =>
        resolveItfFlowSessionEventConfiguration(
          { ITF_FLOW_URL: "http://flow.example.test/workspace/launch" },
          { mode: "production" }
        ),
      (error) => {
        assert.ok(error instanceof WorkspaceConfigurationError);
        assert.match(error.message, /https/);
        assert.match(error.message, /WORKSPACE_INTEROP_SECRET/);
        return true;
      }
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
