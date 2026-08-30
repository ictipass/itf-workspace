import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  decideInitialAdministratorPreparation,
  InitialAdministratorBootstrapError,
  parseInitialAdministratorArguments,
  resolveInitialAdministratorBootstrapTransactionTiming,
} from "../lib/policies/initial-admin-bootstrap";
import { bootstrapInitialAdministrator } from "../lib/services/initial-admin-bootstrap.service";

const identity = {
  email: "odukaye.abiodun@itf.gov.ng",
  fullName: "Abiodun Muh'd-Ahmad Odukaye",
  staffNumber: "06579",
};

describe("initial administrator bootstrap policy", () => {
  test("parses explicit identity values and preserves a leading-zero staff number", () => {
    assert.deepEqual(
      parseInitialAdministratorArguments([
        "--email",
        "ODUKAYE.ABIODUN@ITF.GOV.NG",
        "--full-name",
        "Abiodun Muh'd-Ahmad Odukaye",
        "--staff-number",
        "06579",
      ]),
      identity
    );
  });

  test("rejects missing, duplicate and unknown options", () => {
    assert.throws(
      () => parseInitialAdministratorArguments(["--email", identity.email]),
      /full name is required/i
    );
    assert.throws(
      () =>
        parseInitialAdministratorArguments([
          "--email",
          identity.email,
          "--email",
          identity.email,
        ]),
      /more than once/
    );
    assert.throws(
      () => parseInitialAdministratorArguments(["--role", "SYSTEM_ADMIN"]),
      /Unknown bootstrap option/
    );
  });

  test("rejects a shell-escaped email address", () => {
    assert.throws(
      () =>
        parseInitialAdministratorArguments([
          "--email",
          "odukaye.abiodun\\@itf.gov.ng",
          "--full-name",
          identity.fullName,
          "--staff-number",
          identity.staffNumber,
        ]),
      /valid email address/
    );
  });

  test("uses bounded configurable remote-transaction timing", () => {
    assert.deepEqual(resolveInitialAdministratorBootstrapTransactionTiming({}), {
      maxWait: 15_000,
      timeout: 30_000,
    });
    assert.deepEqual(
      resolveInitialAdministratorBootstrapTransactionTiming({
        WORKSPACE_BOOTSTRAP_TRANSACTION_MAX_WAIT_MS: "20000",
        WORKSPACE_BOOTSTRAP_TRANSACTION_TIMEOUT_MS: "45000",
      }),
      { maxWait: 20_000, timeout: 45_000 }
    );
    assert.throws(
      () =>
        resolveInitialAdministratorBootstrapTransactionTiming({
          WORKSPACE_BOOTSTRAP_TRANSACTION_MAX_WAIT_MS: "200",
        }),
      /between 1000 and 120000/
    );
  });

  test("permits only an exact inactive pending administrator to resume", () => {
    assert.deepEqual(
      decideInitialAdministratorPreparation({
        identity,
        conflictingUserExists: true,
        existingAdministrators: [
          {
            id: "pending-admin",
            ...identity,
            status: "INACTIVE",
            isTemporaryPassword: true,
          },
        ],
      }),
      { action: "RESUME", userId: "pending-admin" }
    );

    assert.throws(
      () =>
        decideInitialAdministratorPreparation({
          identity,
          conflictingUserExists: false,
          existingAdministrators: [
            {
              id: "active-admin",
              ...identity,
              status: "ACTIVE",
              isTemporaryPassword: true,
            },
          ],
        }),
      /SYSTEM_ADMIN already exists/
    );
  });

  test("rejects an existing non-administrator identity conflict", () => {
    assert.throws(
      () =>
        decideInitialAdministratorPreparation({
          identity,
          existingAdministrators: [],
          conflictingUserExists: true,
        }),
      /email or staff number belongs to an existing user/
    );
  });
});

describe("initial administrator bootstrap workflow", () => {
  test("emails the generated credential before activating the pending account", async () => {
    const events: string[] = [];
    const result = await bootstrapInitialAdministrator(identity, {
      deploymentStage: "staging",
      assertEmailDeliveryConfigured: () => events.push("email-config"),
      generateTemporaryPassword: () => "random-single-use-password",
      hashPassword: async (password) => {
        events.push(`hash:${password}`);
        return "password-hash";
      },
      preparePendingAdministrator: async (receivedIdentity, hash) => {
        assert.deepEqual(receivedIdentity, identity);
        assert.equal(hash, "password-hash");
        events.push("prepare-inactive");
        return { userId: "admin-id", resumed: false };
      },
      sendWelcomeEmail: async ({ temporaryPassword }) => {
        assert.equal(temporaryPassword, "random-single-use-password");
        events.push("email-delivered");
      },
      activatePendingAdministrator: async () => {
        events.push("activate");
      },
    });

    assert.deepEqual(events, [
      "email-config",
      "hash:random-single-use-password",
      "prepare-inactive",
      "email-delivered",
      "activate",
    ]);
    assert.deepEqual(result, {
      userId: "admin-id",
      email: identity.email,
      resumed: false,
    });
    assert.equal("temporaryPassword" in result, false);
  });

  test("fails outside staging before touching delivery or persistence", async () => {
    let touched = false;

    await assert.rejects(
      () =>
        bootstrapInitialAdministrator(identity, {
          deploymentStage: "production",
          assertEmailDeliveryConfigured: () => {
            touched = true;
          },
          generateTemporaryPassword: () => "unused",
          hashPassword: async () => "unused",
          preparePendingAdministrator: async () => ({
            userId: "unused",
            resumed: false,
          }),
          sendWelcomeEmail: async () => undefined,
          activatePendingAdministrator: async () => undefined,
        }),
      InitialAdministratorBootstrapError
    );
    assert.equal(touched, false);
  });

  test("does not activate the pending administrator when email delivery fails", async () => {
    let activated = false;

    await assert.rejects(
      () =>
        bootstrapInitialAdministrator(identity, {
          deploymentStage: "staging",
          assertEmailDeliveryConfigured: () => undefined,
          generateTemporaryPassword: () => "random-single-use-password",
          hashPassword: async () => "password-hash",
          preparePendingAdministrator: async () => ({
            userId: "pending-admin",
            resumed: false,
          }),
          sendWelcomeEmail: async () => {
            throw new Error("provider unavailable");
          },
          activatePendingAdministrator: async () => {
            activated = true;
          },
        }),
      /pending account remains inactive/
    );
    assert.equal(activated, false);
  });
});
