import { createHash, randomBytes } from "node:crypto";

const GROUP_SIZE = 4;

export function generateMfaRecoveryCode() {
  const raw = randomBytes(12).toString("hex").toUpperCase();
  return raw.match(new RegExp(`.{1,${GROUP_SIZE}}`, "g"))!.join("-");
}

export function normalizeMfaRecoveryCode(value: string) {
  return value.toUpperCase().replace(/[^A-F0-9]/g, "");
}

export function hashMfaRecoveryCode(userId: string, value: string) {
  return createHash("sha256")
    .update(`${userId}:${normalizeMfaRecoveryCode(value)}`)
    .digest("hex");
}
