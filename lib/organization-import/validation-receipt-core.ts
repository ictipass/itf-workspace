import { createHmac, timingSafeEqual } from "node:crypto";

type ReceiptPayload = {
  v: 1;
  userId: string;
  digest: string;
  expiresAt: number;
};

type ReceiptEnvironment = Readonly<Record<string, string | undefined>>;

function signingSecret(environment: ReceiptEnvironment = process.env) {
  const secret =
    environment.AUTH_SECRET?.trim() || environment.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("Workspace authentication secret is not configured.");
  }
  return secret;
}

function signature(encodedPayload: string, environment?: ReceiptEnvironment) {
  return createHmac("sha256", signingSecret(environment))
    .update(`organization-import:${encodedPayload}`)
    .digest("base64url");
}

export function issueOrganizationImportReceipt(input: {
  userId: string;
  digest: string;
  ttlSeconds: number;
  now?: Date;
  environment?: ReceiptEnvironment;
}) {
  const payload: ReceiptPayload = {
    v: 1,
    userId: input.userId,
    digest: input.digest,
    expiresAt:
      Math.floor((input.now?.getTime() ?? Date.now()) / 1000) +
      input.ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded, input.environment)}`;
}

export function verifyOrganizationImportReceipt(input: {
  receipt: string;
  userId: string;
  digest: string;
  now?: Date;
  environment?: ReceiptEnvironment;
}) {
  const [encoded, suppliedSignature, extra] = input.receipt.split(".");
  if (!encoded || !suppliedSignature || extra) return false;
  const expected = signature(encoded, input.environment);
  const suppliedBytes = Buffer.from(suppliedSignature);
  const expectedBytes = Buffer.from(expected);
  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as ReceiptPayload;
    const now = Math.floor((input.now?.getTime() ?? Date.now()) / 1000);
    return (
      payload.v === 1 &&
      payload.userId === input.userId &&
      payload.digest === input.digest &&
      payload.expiresAt > now
    );
  } catch {
    return false;
  }
}
