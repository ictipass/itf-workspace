import "server-only";

import { Prisma, AuditAction } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  matchTotpCounter,
  totpProvisioningUri,
} from "@/lib/security/totp";

async function lockUser(transaction: Prisma.TransactionClient, userId: string) {
  await transaction.$queryRaw`
    SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE
  `;
}

export async function beginTotpEnrollment(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, totpEnrolledAt: true },
  });
  if (!user) throw new Error("Workspace user was not found.");
  if (user.totpEnrolledAt) throw new Error("TOTP is already enrolled.");

  const secret = generateTotpSecret();
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpPendingSecretCiphertext: encryptTotpSecret(secret),
      totpPendingExpiresAt: expiresAt,
    },
  });
  return {
    secret,
    expiresAt,
    provisioningUri: totpProvisioningUri({ secret, accountName: user.email }),
  };
}

export async function confirmTotpEnrollment(input: {
  userId: string;
  workspaceSessionId: string;
  code: string;
}) {
  const now = new Date();
  return prisma.$transaction(async (transaction) => {
    await lockUser(transaction, input.userId);
    const user = await transaction.user.findUnique({
      where: { id: input.userId },
      select: {
        totpEnrolledAt: true,
        totpPendingSecretCiphertext: true,
        totpPendingExpiresAt: true,
        totpLastUsedCounter: true,
      },
    });
    if (
      !user ||
      user.totpEnrolledAt ||
      !user.totpPendingSecretCiphertext ||
      !user.totpPendingExpiresAt ||
      user.totpPendingExpiresAt <= now
    ) {
      throw new Error("The TOTP enrollment challenge is missing or expired.");
    }
    const secret = decryptTotpSecret(user.totpPendingSecretCiphertext);
    const counter = matchTotpCounter(secret, input.code, { now });
    if (counter === null) throw new Error("The TOTP code is invalid.");

    await transaction.user.update({
      where: { id: input.userId },
      data: {
        totpSecretCiphertext: user.totpPendingSecretCiphertext,
        totpEnrolledAt: now,
        totpPendingSecretCiphertext: null,
        totpPendingExpiresAt: null,
        totpLastUsedCounter: BigInt(counter),
      },
    });
    await transaction.workspaceSession.update({
      where: { id: input.workspaceSessionId, userId: input.userId },
      data: { mfaAuthenticatedAt: now, authenticationMethods: ["pwd", "totp"] },
    });
    await transaction.auditLog.create({
      data: {
        actorId: input.userId,
        action: AuditAction.MFA_ENROLLED,
        metadata: { method: "totp", workspaceSessionId: input.workspaceSessionId },
      },
    });
    return now;
  });
}

export async function verifyTotpStepUp(input: {
  userId: string;
  workspaceSessionId: string;
  code: string;
}) {
  const now = new Date();
  return prisma.$transaction(async (transaction) => {
    await lockUser(transaction, input.userId);
    const user = await transaction.user.findUnique({
      where: { id: input.userId },
      select: { totpSecretCiphertext: true, totpLastUsedCounter: true },
    });
    if (!user?.totpSecretCiphertext) throw new Error("TOTP is not enrolled.");
    const counter = matchTotpCounter(
      decryptTotpSecret(user.totpSecretCiphertext),
      input.code,
      { now }
    );
    if (
      counter === null ||
      (user.totpLastUsedCounter !== null && BigInt(counter) <= user.totpLastUsedCounter)
    ) {
      throw new Error("The TOTP code is invalid or has already been used.");
    }

    await transaction.user.update({
      where: { id: input.userId },
      data: { totpLastUsedCounter: BigInt(counter) },
    });
    await transaction.workspaceSession.update({
      where: { id: input.workspaceSessionId, userId: input.userId },
      data: { mfaAuthenticatedAt: now, authenticationMethods: ["pwd", "totp"] },
    });
    await transaction.auditLog.create({
      data: {
        actorId: input.userId,
        action: AuditAction.MFA_VERIFIED,
        metadata: { method: "totp", workspaceSessionId: input.workspaceSessionId },
      },
    });
    return now;
  });
}
