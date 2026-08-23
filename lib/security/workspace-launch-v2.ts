import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  sign as signBytes,
  verify as verifyBytes,
  type JsonWebKey,
  type KeyObject,
} from "node:crypto";
import { AssuranceRequirement } from "@/lib/generated/prisma/client";
import { resolveWorkspaceLaunchV2Configuration } from "@/lib/config/workspace-environment";

export const WORKSPACE_LAUNCH_V2_VERSION = "itf-workspace-launch-v2";
export const WORKSPACE_LAUNCH_V2_TYPE = "itf-workspace-launch+jwt";

export type WorkspaceLaunchV2Payload = {
  version: typeof WORKSPACE_LAUNCH_V2_VERSION;
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  nbf: number;
  exp: number;
  jti: string;
  identity: {
    name?: string | null;
    email?: string | null;
    staffNumber?: string | null;
    workspaceRole: string;
    officeId?: string | null;
    departmentId?: string | null;
    divisionId?: string | null;
    unitId?: string | null;
    positionId?: string | null;
  };
  entitlement: {
    appId: string;
    slug: string;
    role: string;
    requiredAssurance: AssuranceRequirement;
  };
  authentication: {
    workspaceSessionId: string;
    methods: string[];
    authenticatedAt: number;
    idleExpiresAt: number;
    absoluteExpiresAt: number;
    mfaAuthenticatedAt?: number;
  };
};

type LaunchSigner = {
  keyId: string;
  publicJwk: Record<string, unknown>;
  sign(input: string): string;
};

type DevelopmentSigningMaterial = {
  privateKey: KeyObject;
  publicKey: KeyObject;
};

const globalForLaunchKeys = globalThis as typeof globalThis & {
  __itfWorkspaceDevelopmentLaunchKey?: DevelopmentSigningMaterial;
};

function encodedJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function publicKeyId(publicKey: KeyObject) {
  const der = publicKey.export({ type: "spki", format: "der" });
  return `dev-${createHash("sha256").update(der).digest("base64url").slice(0, 20)}`;
}

function buildSoftwareSigner(
  privateKey: KeyObject,
  configuredKeyId?: string
): LaunchSigner {
  const publicKey = createPublicKey(privateKey);
  const keyId = configuredKeyId ?? publicKeyId(publicKey);
  const jwk = publicKey.export({ format: "jwk" }) as JsonWebKey;
  const publicJwk = { ...jwk, kid: keyId, alg: "RS256", use: "sig" };

  return {
    keyId,
    publicJwk,
    sign(input) {
      return signBytes("RSA-SHA256", Buffer.from(input), privateKey).toString(
        "base64url"
      );
    },
  };
}

export function getWorkspaceLaunchSigner(): LaunchSigner {
  const configuration = resolveWorkspaceLaunchV2Configuration();

  if (configuration.signerProvider === "kms") {
    throw new Error(
      "The production KMS/HSM signing adapter must be configured before launch."
    );
  }

  if (configuration.signerProvider === "software") {
    const pem = Buffer.from(configuration.privateKeyPemBase64!, "base64").toString(
      "utf8"
    );
    return buildSoftwareSigner(createPrivateKey(pem), configuration.activeKeyId);
  }

  if (!globalForLaunchKeys.__itfWorkspaceDevelopmentLaunchKey) {
    globalForLaunchKeys.__itfWorkspaceDevelopmentLaunchKey = generateKeyPairSync(
      "rsa",
      { modulusLength: 3072 }
    );
  }
  return buildSoftwareSigner(
    globalForLaunchKeys.__itfWorkspaceDevelopmentLaunchKey.privateKey,
    configuration.activeKeyId
  );
}

export function getWorkspaceLaunchPublicJwks() {
  const configuration = resolveWorkspaceLaunchV2Configuration();
  const active = getWorkspaceLaunchSigner().publicJwk;
  const keys = [active, ...configuration.additionalPublicJwks].filter(
    (key, index, all) =>
      typeof key.kid === "string" &&
      all.findIndex((candidate) => candidate.kid === key.kid) === index
  );
  return { keys };
}

export function createWorkspaceLaunchV2Token(
  input: Omit<
    WorkspaceLaunchV2Payload,
    "version" | "iss" | "iat" | "nbf" | "exp" | "jti"
  >,
  options: { now?: Date } = {}
) {
  const configuration = resolveWorkspaceLaunchV2Configuration();
  const signer = getWorkspaceLaunchSigner();
  const issuedAt = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const payload: WorkspaceLaunchV2Payload = {
    version: WORKSPACE_LAUNCH_V2_VERSION,
    iss: configuration.issuer,
    iat: issuedAt,
    nbf: issuedAt,
    exp: issuedAt + configuration.ttlSeconds,
    jti: randomUUID(),
    ...input,
  };
  const header = {
    alg: "RS256",
    typ: WORKSPACE_LAUNCH_V2_TYPE,
    kid: signer.keyId,
  };
  const signingInput = `${encodedJson(header)}.${encodedJson(payload)}`;
  return {
    token: `${signingInput}.${signer.sign(signingInput)}`,
    tokenId: payload.jti,
    expiresAt: payload.exp,
    keyId: signer.keyId,
    payload,
  };
}

export function verifyWorkspaceLaunchV2Token(
  token: string,
  options: {
    publicJwk: JsonWebKey;
    expectedKeyId: string;
    expectedIssuer: string;
    expectedAudience: string;
    expectedAppSlug: string;
    ttlSeconds?: number;
    clockSkewSeconds?: number;
    stepUpSeconds?: number;
    now?: Date;
  }
) {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("Invalid Workspace launch v2 token structure.");
  }
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8")) as {
    alg?: unknown;
    typ?: unknown;
    kid?: unknown;
  };
  if (
    header.alg !== "RS256" ||
    header.typ !== WORKSPACE_LAUNCH_V2_TYPE ||
    header.kid !== options.expectedKeyId
  ) {
    throw new Error("Workspace launch v2 header is not allowed.");
  }
  const validSignature = verifyBytes(
    "RSA-SHA256",
    Buffer.from(`${headerPart}.${payloadPart}`),
    createPublicKey({ key: options.publicJwk, format: "jwk" }),
    Buffer.from(signaturePart, "base64url")
  );
  if (!validSignature) throw new Error("Invalid Workspace launch v2 signature.");

  const payload = JSON.parse(
    Buffer.from(payloadPart, "base64url").toString("utf8")
  ) as WorkspaceLaunchV2Payload;
  const now = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const ttl = options.ttlSeconds ?? 120;
  const skew = options.clockSkewSeconds ?? 30;
  const stepUp = options.stepUpSeconds ?? 600;

  if (
    payload.version !== WORKSPACE_LAUNCH_V2_VERSION ||
    payload.iss !== options.expectedIssuer ||
    payload.aud !== options.expectedAudience ||
    !payload.sub ||
    !payload.jti ||
    !payload.authentication?.workspaceSessionId ||
    payload.entitlement?.slug !== options.expectedAppSlug ||
    !payload.entitlement?.role ||
    !Object.values(AssuranceRequirement).includes(payload.entitlement.requiredAssurance) ||
    !Array.isArray(payload.authentication.methods) ||
    !Number.isInteger(payload.authentication.authenticatedAt) ||
    !Number.isInteger(payload.authentication.idleExpiresAt) ||
    !Number.isInteger(payload.authentication.absoluteExpiresAt)
  ) {
    throw new Error("Workspace launch v2 claims are invalid.");
  }
  if (
    !Number.isInteger(payload.iat) ||
    !Number.isInteger(payload.nbf) ||
    !Number.isInteger(payload.exp) ||
    payload.iat > now + skew ||
    payload.nbf > now + skew ||
    payload.exp + skew < now ||
    payload.exp <= payload.iat ||
    payload.exp - payload.iat > ttl ||
    payload.authentication.authenticatedAt > payload.iat + skew ||
    payload.authentication.idleExpiresAt <= now ||
    payload.authentication.absoluteExpiresAt <= now ||
    payload.authentication.idleExpiresAt > payload.authentication.absoluteExpiresAt ||
    payload.authentication.absoluteExpiresAt < payload.authentication.authenticatedAt
  ) {
    throw new Error("Workspace launch v2 timing is invalid.");
  }
  if (!payload.authentication.methods.includes("pwd")) {
    throw new Error("Workspace primary authentication is missing.");
  }
  if (payload.entitlement.requiredAssurance === AssuranceRequirement.SENSITIVE) {
    const mfaAt = payload.authentication.mfaAuthenticatedAt;
    if (
      !payload.authentication.methods.includes("totp") ||
      !mfaAt ||
      mfaAt > payload.iat + skew ||
      mfaAt < payload.iat - stepUp
    ) {
      throw new Error("Fresh Workspace MFA is required.");
    }
  }
  return payload;
}
