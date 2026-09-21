import "server-only";

import bcrypt from "bcryptjs";
import { Prisma, AuditAction } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  matchTotpCounter,
  totpProvisioningUri,
} from "@/lib/security/totp";
import {
  generateMfaRecoveryCode,
  hashMfaRecoveryCode,
} from "@/lib/security/mfa-recovery-code";
import {
  deliverItfFlowSessionEvents,
  revokeWorkspaceSessionsInTransaction,
} from "@/lib/integrations/itf-flow-session-events";
import { WorkspaceSessionRevocationReason } from "@/lib/generated/prisma/client";
import { sendWorkspaceSecurityEmail } from "@/lib/email/send-workspace-security-email";
import { resolveWorkspaceMfaRecoveryConfiguration } from "@/lib/config/workspace-environment";

const RECOVERY_CODE_COUNT = 10;

async function notifyMfaSecurityEvent(
  userId: string,
  subject: string,
  message: string,
  event: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } });
  if (!user) return false;
  let delivered = true;
  try {
    await sendWorkspaceSecurityEmail({ to: user.email, fullName: user.fullName, subject, message });
  } catch {
    delivered = false;
  }
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: delivered ? AuditAction.SECURITY_NOTIFICATION_SENT : AuditAction.SECURITY_NOTIFICATION_FAILED,
      metadata: { event },
    },
  });
  return delivered;
}

async function replaceRecoveryCodes(transaction: Prisma.TransactionClient, userId: string) {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateMfaRecoveryCode);
  await transaction.mfaRecoveryCode.deleteMany({ where: { userId } });
  await transaction.mfaRecoveryCode.createMany({
    data: codes.map((code) => ({ userId, codeHash: hashMfaRecoveryCode(userId, code) })),
  });
  return codes;
}

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
        mfaEnrollmentRequired: false,
        mfaRecoveryFailedAttempts: 0,
        mfaRecoveryLockedUntil: null,
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
    const recoveryCodes = await replaceRecoveryCodes(transaction, input.userId);
    return { enrolledAt: now, recoveryCodes };
  });
}

export async function beginTotpReplacement(input: {
  userId: string;
  workspaceSessionId: string;
  currentPassword: string;
  currentCode: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true, passwordHash: true },
  });
  if (!user) throw new Error("Workspace user was not found.");
  if (!user.passwordHash || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw new Error("The current password is invalid.");
  }
  await verifyTotpStepUp({
    userId: input.userId,
    workspaceSessionId: input.workspaceSessionId,
    code: input.currentCode,
  });
  const secret = generateTotpSecret();
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: input.userId },
      data: {
        totpPendingSecretCiphertext: encryptTotpSecret(secret),
        totpPendingExpiresAt: expiresAt,
      },
    }),
    prisma.auditLog.create({
      data: { actorId: input.userId, action: AuditAction.MFA_REPLACEMENT_STARTED },
    }),
  ]);
  return { secret, expiresAt, provisioningUri: totpProvisioningUri({ secret, accountName: user.email }) };
}

export async function confirmTotpReplacement(input: {
  userId: string;
  code: string;
}) {
  const now = new Date();
  const result = await prisma.$transaction(async (transaction) => {
    await lockUser(transaction, input.userId);
    const user = await transaction.user.findUnique({
      where: { id: input.userId },
      select: { totpPendingSecretCiphertext: true, totpPendingExpiresAt: true },
    });
    if (!user?.totpPendingSecretCiphertext || !user.totpPendingExpiresAt || user.totpPendingExpiresAt <= now) {
      throw new Error("The authenticator replacement challenge is missing or expired.");
    }
    const counter = matchTotpCounter(
      decryptTotpSecret(user.totpPendingSecretCiphertext),
      input.code,
      { now }
    );
    if (counter === null) throw new Error("The new authenticator code is invalid.");
    await transaction.user.update({
      where: { id: input.userId },
      data: {
        totpSecretCiphertext: user.totpPendingSecretCiphertext,
        totpEnrolledAt: now,
        totpPendingSecretCiphertext: null,
        totpPendingExpiresAt: null,
        totpLastUsedCounter: BigInt(counter),
        mfaEnrollmentRequired: false,
        mfaRecoveryFailedAttempts: 0,
        mfaRecoveryLockedUntil: null,
      },
    });
    const recoveryCodes = await replaceRecoveryCodes(transaction, input.userId);
    const revoked = await revokeWorkspaceSessionsInTransaction(
      transaction,
      { userId: input.userId },
      WorkspaceSessionRevocationReason.MFA_REPLACED,
      now
    );
    await transaction.auditLog.create({
      data: { actorId: input.userId, action: AuditAction.MFA_REPLACED, metadata: { revokedSessions: revoked.count } },
    });
    return { recoveryCodes, eventIds: revoked.eventIds };
  });
  await deliverItfFlowSessionEvents(result.eventIds);
  await notifyMfaSecurityEvent(
    input.userId,
    "ITF Workspace authenticator replaced",
    "Your authenticator was replaced, all previous recovery codes were invalidated and every session was terminated.",
    "MFA_REPLACED"
  );
  return result.recoveryCodes;
}

export async function recoverWithOneTimeCode(input: { userId: string; password: string; code: string }) {
  const now = new Date();
  const configuration = resolveWorkspaceMfaRecoveryConfiguration();
  const result = await prisma.$transaction(async (transaction) => {
    await lockUser(transaction, input.userId);
    const user = await transaction.user.findUnique({
      where: { id: input.userId },
      select: {
        passwordHash: true,
        mfaRecoveryFailedAttempts: true,
        mfaRecoveryLockedUntil: true,
      },
    });
    if (!user?.passwordHash) throw new Error("Recovery is unavailable for this account.");
    if (user.mfaRecoveryLockedUntil && user.mfaRecoveryLockedUntil > now) {
      throw new Error("Recovery is temporarily locked. Contact ICT support.");
    }
    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    const codeHash = hashMfaRecoveryCode(input.userId, input.code);
    const recoveryCode = passwordValid
      ? await transaction.mfaRecoveryCode.findFirst({
          where: { userId: input.userId, codeHash, consumedAt: null },
        })
      : null;
    if (!recoveryCode) {
      const failedAttempts = user.mfaRecoveryFailedAttempts + 1;
      await transaction.user.update({
        where: { id: input.userId },
        data: {
          mfaRecoveryFailedAttempts: failedAttempts >= configuration.maxAttempts ? 0 : failedAttempts,
          mfaRecoveryLockedUntil:
            failedAttempts >= configuration.maxAttempts
              ? new Date(now.getTime() + configuration.lockMinutes * 60_000)
              : null,
        },
      });
      return { valid: false as const, eventIds: [] as string[] };
    }
    await transaction.mfaRecoveryCode.update({ where: { id: recoveryCode.id }, data: { consumedAt: now } });
    await transaction.user.update({
      where: { id: input.userId },
      data: {
        totpSecretCiphertext: null,
        totpEnrolledAt: null,
        totpPendingSecretCiphertext: null,
        totpPendingExpiresAt: null,
        totpLastUsedCounter: null,
        mfaEnrollmentRequired: true,
        mfaRecoveryFailedAttempts: 0,
        mfaRecoveryLockedUntil: null,
      },
    });
    const revoked = await revokeWorkspaceSessionsInTransaction(
      transaction,
      { userId: input.userId },
      WorkspaceSessionRevocationReason.MFA_RECOVERY,
      now
    );
    await transaction.auditLog.create({
      data: {
        actorId: input.userId,
        action: AuditAction.MFA_RECOVERY_COMPLETED,
        metadata: { method: "recovery_code", revokedSessions: revoked.count },
      },
    });
    return { valid: true as const, eventIds: revoked.eventIds };
  });
  if (!result.valid) throw new Error("The password or recovery code is invalid.");
  await deliverItfFlowSessionEvents(result.eventIds);
  await notifyMfaSecurityEvent(
    input.userId,
    "ITF Workspace recovery code used",
    "A recovery code invalidated your previous authenticator and terminated every session. Sign in and enroll a new authenticator.",
    "MFA_RECOVERY_CODE_USED"
  );
}

export async function regenerateRecoveryCodes(userId: string) {
  const codes = await prisma.$transaction(async (transaction) => {
    const codes = await replaceRecoveryCodes(transaction, userId);
    await transaction.auditLog.create({
      data: { actorId: userId, action: AuditAction.MFA_RECOVERY_CODES_REGENERATED },
    });
    return codes;
  });
  await notifyMfaSecurityEvent(
    userId,
    "ITF Workspace recovery codes regenerated",
    "A new recovery-code set was generated and every older unused recovery code was invalidated.",
    "MFA_RECOVERY_CODES_REGENERATED"
  );
  return codes;
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
