import assert from "node:assert/strict";
import { generateKeyPairSync, type JsonWebKey } from "node:crypto";
import { after, before, describe, test } from "node:test";

import { AssuranceRequirement, WorkspaceRole } from "../lib/generated/prisma/client";
import {
  createWorkspaceLaunchV2Token,
  getWorkspaceLaunchSigner,
  verifyWorkspaceLaunchV2Token,
} from "../lib/security/workspace-launch-v2";
import { effectiveLaunchAssurance, hasFreshMfa } from "../lib/security/launch-assurance";
import { decryptTotpSecret, encryptTotpSecret, matchTotpCounter } from "../lib/security/totp";

const managedVariables = [
  "WORKSPACE_LAUNCH_ISSUER",
  "WORKSPACE_LAUNCH_SIGNER_PROVIDER",
  "WORKSPACE_LAUNCH_ACTIVE_KID",
  "WORKSPACE_LAUNCH_PRIVATE_KEY_PEM_BASE64",
] as const;
const originalEnvironment = Object.fromEntries(
  managedVariables.map((name) => [name, process.env[name]])
);

before(() => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 3072 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  process.env.WORKSPACE_LAUNCH_ISSUER = "https://workspace.example.test";
  process.env.WORKSPACE_LAUNCH_SIGNER_PROVIDER = "software";
  process.env.WORKSPACE_LAUNCH_ACTIVE_KID = "test-key-1";
  process.env.WORKSPACE_LAUNCH_PRIVATE_KEY_PEM_BASE64 = Buffer.from(pem).toString("base64");
});

after(() => {
  for (const name of managedVariables) {
    const value = originalEnvironment[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

const issuedAt = new Date("2026-08-23T12:00:00.000Z");

function launchInput(
  requiredAssurance: AssuranceRequirement = AssuranceRequirement.STANDARD
) {
  return {
    sub: "workspace-user-1",
    aud: "itf-flow",
    identity: {
      name: "Example Staff",
      email: "staff@example.test",
      staffNumber: "ITF-001",
      workspaceRole: WorkspaceRole.STAFF,
    },
    entitlement: {
      appId: "workspace-app-1",
      slug: "itf-flow",
      role: "STAFF",
      requiredAssurance,
    },
    authentication: {
      workspaceSessionId: "workspace-session-1",
      methods: requiredAssurance === AssuranceRequirement.SENSITIVE ? ["pwd", "totp"] : ["pwd"],
      authenticatedAt: Math.floor(issuedAt.getTime() / 1000) - 60,
      mfaAuthenticatedAt:
        requiredAssurance === AssuranceRequirement.SENSITIVE
          ? Math.floor(issuedAt.getTime() / 1000) - 30
          : undefined,
    },
  };
}

function verify(token: string, now = issuedAt) {
  const signer = getWorkspaceLaunchSigner();
  return verifyWorkspaceLaunchV2Token(token, {
    publicJwk: signer.publicJwk as JsonWebKey,
    expectedKeyId: signer.keyId,
    expectedIssuer: "https://workspace.example.test/",
    expectedAudience: "itf-flow",
    expectedAppSlug: "itf-flow",
    now,
  });
}

describe("Workspace launch v2 assertions", () => {
  test("issues a signed, audience-bound standard assertion", () => {
    const issued = createWorkspaceLaunchV2Token(launchInput(), { now: issuedAt });
    const payload = verify(issued.token);
    assert.equal(payload.jti, issued.tokenId);
    assert.equal(payload.exp - payload.iat, 120);
    assert.equal(payload.aud, "itf-flow");
  });

  test("rejects tampering, the wrong audience and tokens beyond the skew window", () => {
    const issued = createWorkspaceLaunchV2Token(launchInput(), { now: issuedAt });
    const finalCharacter = issued.token.at(-1);
    const tampered = `${issued.token.slice(0, -1)}${finalCharacter === "a" ? "b" : "a"}`;
    assert.throws(() => verify(tampered), /signature/);
    assert.throws(
      () => verifyWorkspaceLaunchV2Token(issued.token, {
        publicJwk: getWorkspaceLaunchSigner().publicJwk as JsonWebKey,
        expectedKeyId: "test-key-1",
        expectedIssuer: "https://workspace.example.test/",
        expectedAudience: "another-app",
        expectedAppSlug: "itf-flow",
        now: issuedAt,
      }),
      /claims/
    );
    assert.throws(
      () => verify(issued.token, new Date(issuedAt.getTime() + 151_000)),
      /timing/
    );
  });

  test("requires recent TOTP only for sensitive assertions", () => {
    const valid = createWorkspaceLaunchV2Token(
      launchInput(AssuranceRequirement.SENSITIVE),
      { now: issuedAt }
    );
    assert.equal(verify(valid.token).entitlement.requiredAssurance, "SENSITIVE");

    const missingMfa = launchInput(AssuranceRequirement.SENSITIVE);
    missingMfa.authentication.methods = ["pwd"];
    missingMfa.authentication.mfaAuthenticatedAt = undefined;
    const invalid = createWorkspaceLaunchV2Token(missingMfa, { now: issuedAt });
    assert.throws(() => verify(invalid.token), /Fresh Workspace MFA/);
  });
});

describe("launch assurance and TOTP controls", () => {
  test("uses the most restrictive app, role or Workspace classification", () => {
    assert.equal(
      effectiveLaunchAssurance(WorkspaceRole.STAFF, AssuranceRequirement.STANDARD, AssuranceRequirement.STANDARD),
      AssuranceRequirement.STANDARD
    );
    assert.equal(
      effectiveLaunchAssurance(WorkspaceRole.STAFF, AssuranceRequirement.STANDARD, AssuranceRequirement.SENSITIVE),
      AssuranceRequirement.SENSITIVE
    );
    assert.equal(
      effectiveLaunchAssurance(WorkspaceRole.SYSTEM_ADMIN, AssuranceRequirement.STANDARD, AssuranceRequirement.STANDARD),
      AssuranceRequirement.SENSITIVE
    );
    assert.equal(hasFreshMfa(new Date(issuedAt.getTime() - 600_000), 600, issuedAt), true);
    assert.equal(hasFreshMfa(new Date(issuedAt.getTime() - 600_001), 600, issuedAt), false);
  });

  test("matches the RFC TOTP vector and encrypts secrets with authenticated encryption", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    assert.equal(matchTotpCounter(secret, "287082", { now: new Date(59_000), window: 0 }), 1);

    const environment: NodeJS.ProcessEnv = {
      NODE_ENV: "test",
      WORKSPACE_MFA_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 7).toString("base64"),
    };
    const ciphertext = encryptTotpSecret(secret, environment);
    assert.notEqual(ciphertext, secret);
    assert.equal(decryptTotpSecret(ciphertext, environment), secret);
    assert.throws(() => decryptTotpSecret(`${ciphertext.slice(0, -1)}A`, environment));
  });
});
