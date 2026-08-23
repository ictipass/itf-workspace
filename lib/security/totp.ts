import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD_SECONDS = 30;
const DIGITS = 6;

function base32Encode(value: Buffer) {
  let bits = "";
  for (const byte of value) bits += byte.toString(2).padStart(8, "0");
  let encoded = "";
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    encoded += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return encoded;
}

function base32Decode(value: string) {
  let bits = "";
  for (const character of value.toUpperCase().replaceAll(/[^A-Z2-7]/g, "")) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Invalid TOTP secret.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function counterBuffer(counter: number) {
  const value = Buffer.alloc(8);
  value.writeBigUInt64BE(BigInt(counter));
  return value;
}

function codeForCounter(secret: string, counter: number) {
  const digest = createHmac("sha1", base32Decode(secret))
    .update(counterBuffer(counter))
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

function encryptionKey(environment: NodeJS.ProcessEnv = process.env) {
  const configured = environment.WORKSPACE_MFA_ENCRYPTION_KEY_BASE64;
  const key = configured ? Buffer.from(configured, "base64") : Buffer.alloc(0);
  if (key.length !== 32) {
    throw new Error(
      "WORKSPACE_MFA_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes before MFA can be used."
    );
  }
  return key;
}

export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function totpProvisioningUri(input: {
  secret: string;
  accountName: string;
  issuer?: string;
}) {
  const issuer = input.issuer ?? "ITF Workspace";
  const label = `${issuer}:${input.accountName}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function verifyTotpCode(
  secret: string,
  suppliedCode: string,
  options: { now?: Date; window?: number } = {}
) {
  return matchTotpCounter(secret, suppliedCode, options) !== null;
}

export function matchTotpCounter(
  secret: string,
  suppliedCode: string,
  options: { now?: Date; window?: number } = {}
) {
  const code = suppliedCode.replaceAll(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return null;
  const counter = Math.floor(
    (options.now ?? new Date()).getTime() / 1000 / PERIOD_SECONDS
  );
  const window = options.window ?? 1;
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = codeForCounter(secret, counter + offset);
    if (timingSafeEqual(Buffer.from(code), Buffer.from(expected))) {
      return counter + offset;
    }
  }
  return null;
}

export function encryptTotpSecret(
  secret: string,
  environment: NodeJS.ProcessEnv = process.env
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(environment), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptTotpSecret(
  encrypted: string,
  environment: NodeJS.ProcessEnv = process.env
) {
  const parts = encrypted.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted TOTP secret.");
  const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(environment), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
