import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const TOKEN_VERSION = "itf-workspace-launch-v1";
const DEFAULT_TTL_SECONDS = 60;

export type WorkspaceLaunchTokenPayload = {
  version: typeof TOKEN_VERSION;
  tokenId: string;
  issuedAt: number;
  expiresAt: number;
  user: {
    id: string;
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
  app: {
    id: string;
    slug: string;
    name: string;
    role?: string | null;
  };
};

function getLaunchTokenSecret() {
  const secret = process.env.WORKSPACE_LAUNCH_TOKEN_SECRET;

  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("WORKSPACE_LAUNCH_TOKEN_SECRET is required in production.");
  }

  return "development-only-workspace-launch-token-secret";
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return Buffer.from(
    padded.replaceAll("-", "+").replaceAll("_", "/"),
    "base64"
  ).toString("utf8");
}

function sign(value: string) {
  return base64UrlEncode(
    createHmac("sha256", getLaunchTokenSecret()).update(value).digest()
  );
}

export function createWorkspaceLaunchToken(
  payload: Omit<
    WorkspaceLaunchTokenPayload,
    "version" | "tokenId" | "issuedAt" | "expiresAt"
  >,
  options: { ttlSeconds?: number } = {}
) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + (options.ttlSeconds ?? DEFAULT_TTL_SECONDS);
  const tokenPayload: WorkspaceLaunchTokenPayload = {
    version: TOKEN_VERSION,
    tokenId: randomUUID(),
    issuedAt,
    expiresAt,
    ...payload,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = sign(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    tokenId: tokenPayload.tokenId,
    expiresAt,
  };
}

export function verifyWorkspaceLaunchToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("Invalid launch token.");
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw new Error("Invalid launch token signature.");
  }

  const payload = JSON.parse(
    base64UrlDecode(encodedPayload)
  ) as WorkspaceLaunchTokenPayload;

  if (payload.version !== TOKEN_VERSION) {
    throw new Error("Unsupported launch token version.");
  }

  if (payload.expiresAt < Math.floor(Date.now() / 1000)) {
    throw new Error("Launch token has expired.");
  }

  return payload;
}
