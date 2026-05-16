import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_VERSION = "itf-workspace-launch-v1";
export const WORKSPACE_LAUNCH_TOKEN_PARAM = "workspace_launch_token";

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

export type VerifyWorkspaceLaunchTokenOptions = {
  secret: string;
  expectedAppSlug: string;
  now?: Date;
};

function base64UrlEncode(value: Buffer) {
  return value
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

function sign(encodedPayload: string, secret: string) {
  return base64UrlEncode(createHmac("sha256", secret).update(encodedPayload).digest());
}

export function verifyWorkspaceLaunchTokenForApp(
  token: string,
  options: VerifyWorkspaceLaunchTokenOptions
) {
  if (!options.secret) {
    throw new Error("Workspace launch token secret is required.");
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("Invalid Workspace launch token.");
  }

  const expectedSignature = sign(encodedPayload, options.secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw new Error("Invalid Workspace launch token signature.");
  }

  const payload = JSON.parse(
    base64UrlDecode(encodedPayload)
  ) as WorkspaceLaunchTokenPayload;

  if (payload.version !== TOKEN_VERSION) {
    throw new Error("Unsupported Workspace launch token version.");
  }

  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);

  if (payload.expiresAt < nowSeconds) {
    throw new Error("Workspace launch token has expired.");
  }

  if (payload.app.slug !== options.expectedAppSlug) {
    throw new Error("Workspace launch token was issued for another app.");
  }

  return payload;
}

export function getWorkspaceLaunchTokenFromUrl(url: string | URL) {
  return new URL(url).searchParams.get(WORKSPACE_LAUNCH_TOKEN_PARAM);
}

export function removeWorkspaceLaunchTokenFromUrl(url: string | URL) {
  const cleanUrl = new URL(url);
  cleanUrl.searchParams.delete(WORKSPACE_LAUNCH_TOKEN_PARAM);
  return cleanUrl.toString();
}
