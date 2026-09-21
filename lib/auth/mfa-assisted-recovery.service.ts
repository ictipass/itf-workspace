import "server-only";

import {
  AuditAction,
  MfaRecoveryAuthorityRole,
  MfaRecoveryRequestStatus,
  UserStatus,
  WorkspaceRole,
  WorkspaceSessionRevocationReason,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deliverItfFlowSessionEvents,
  revokeWorkspaceSessionsInTransaction,
} from "@/lib/integrations/itf-flow-session-events";
import { sendWorkspaceSecurityEmail } from "@/lib/email/send-workspace-security-email";
import {
  assertIndependentRecoveryExecutor,
  assertIndependentSecurityApprover,
  canExecuteRecovery,
  initialRecoveryStatus,
} from "@/lib/auth/mfa-recovery-policy";

const REQUEST_LIFETIME_MS = 24 * 60 * 60_000;

function cleanReference(value: string) {
  const reference = value.trim();
  if (reference.length < 5 || reference.length > 200) {
    throw new Error("Enter an approved reference between 5 and 200 characters.");
  }
  return reference;
}

async function activeAuthority(userId: string, role: MfaRecoveryAuthorityRole) {
  return prisma.mfaRecoveryAuthority.findFirst({ where: { userId, role, revokedAt: null } });
}

export async function grantMfaRecoveryAuthority(input: {
  actorId: string;
  userId: string;
  role: MfaRecoveryAuthorityRole;
  approvalReference: string;
}) {
  if (input.actorId === input.userId) throw new Error("Recovery authority cannot be self-assigned.");
  const approvalReference = cleanReference(input.approvalReference);
  return prisma.$transaction(async (transaction) => {
    const target = await transaction.user.findUnique({
      where: { id: input.userId },
      select: { status: true, totpEnrolledAt: true },
    });
    if (!target || target.status !== UserStatus.ACTIVE) throw new Error("Select an active staff account.");
    if (!target.totpEnrolledAt) throw new Error("The authority holder must enroll TOTP first.");
    const existing = await transaction.mfaRecoveryAuthority.findUnique({ where: { userId: input.userId } });
    const authority = existing
      ? await transaction.mfaRecoveryAuthority.update({
          where: { id: existing.id },
          data: { role: input.role, grantedById: input.actorId, approvalReference, grantedAt: new Date(), revokedAt: null },
        })
      : await transaction.mfaRecoveryAuthority.create({
          data: { userId: input.userId, role: input.role, grantedById: input.actorId, approvalReference },
        });
    await transaction.auditLog.create({
      data: { actorId: input.actorId, action: AuditAction.MFA_RECOVERY_AUTHORITY_GRANTED, metadata: { userId: input.userId, role: input.role, approvalReference } },
    });
    return authority;
  });
}

export async function revokeMfaRecoveryAuthority(input: { actorId: string; authorityId: string }) {
  return prisma.$transaction(async (transaction) => {
    const authority = await transaction.mfaRecoveryAuthority.findUnique({ where: { id: input.authorityId } });
    if (!authority || authority.revokedAt) throw new Error("The authority assignment is not active.");
    await transaction.mfaRecoveryAuthority.update({ where: { id: authority.id }, data: { revokedAt: new Date() } });
    await transaction.auditLog.create({
      data: { actorId: input.actorId, action: AuditAction.MFA_RECOVERY_AUTHORITY_REVOKED, metadata: { userId: authority.userId, role: authority.role } },
    });
  });
}

export async function createMfaRecoveryRequest(input: {
  actorId: string;
  targetUserId: string;
  identityVerificationReference: string;
}) {
  if (!(await activeAuthority(input.actorId, MfaRecoveryAuthorityRole.HR_IDENTITY_VERIFIER))) {
    throw new Error("Only an appointed HR identity verifier can record in-person verification.");
  }
  if (input.actorId === input.targetUserId) throw new Error("Identity verification cannot be self-approved.");
  const reference = cleanReference(input.identityVerificationReference);
  return prisma.$transaction(async (transaction) => {
    const target = await transaction.user.findUnique({ where: { id: input.targetUserId } });
    if (!target || target.status !== UserStatus.ACTIVE) throw new Error("Select an active staff account.");
    const open = await transaction.mfaRecoveryRequest.findFirst({
      where: { targetUserId: target.id, status: { in: [MfaRecoveryRequestStatus.APPROVED, MfaRecoveryRequestStatus.PENDING_SECURITY_APPROVAL] }, expiresAt: { gt: new Date() } },
    });
    if (open) throw new Error("This user already has an active recovery request.");
    const privileged = target.workspaceRole !== WorkspaceRole.STAFF;
    const request = await transaction.mfaRecoveryRequest.create({
      data: {
        targetUserId: target.id,
        identityVerifiedById: input.actorId,
        identityVerificationReference: reference,
        status: initialRecoveryStatus(target.workspaceRole),
        expiresAt: new Date(Date.now() + REQUEST_LIFETIME_MS),
      },
    });
    await transaction.auditLog.create({
      data: { actorId: input.actorId, action: AuditAction.MFA_RECOVERY_REQUEST_CREATED, metadata: { requestId: request.id, targetUserId: target.id, privileged, identityVerificationReference: reference } },
    });
    return request;
  });
}

export async function approveMfaRecoveryRequest(input: { actorId: string; requestId: string; approvalReference: string }) {
  if (!(await activeAuthority(input.actorId, MfaRecoveryAuthorityRole.ICT_SECURITY_APPROVER))) {
    throw new Error("Only an appointed ICT Security approver can approve privileged recovery.");
  }
  const approvalReference = cleanReference(input.approvalReference);
  return prisma.$transaction(async (transaction) => {
    const request = await transaction.mfaRecoveryRequest.findUnique({ where: { id: input.requestId } });
    if (!request || request.status !== MfaRecoveryRequestStatus.PENDING_SECURITY_APPROVAL || request.expiresAt <= new Date()) {
      throw new Error("The recovery request is unavailable or expired.");
    }
    assertIndependentSecurityApprover({ actorId: input.actorId, targetUserId: request.targetUserId, identityVerifierId: request.identityVerifiedById });
    const updated = await transaction.mfaRecoveryRequest.update({
      where: { id: request.id },
      data: { status: MfaRecoveryRequestStatus.APPROVED, securityApprovedById: input.actorId, securityApprovalReference: approvalReference, securityApprovedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: { actorId: input.actorId, action: AuditAction.MFA_RECOVERY_REQUEST_APPROVED, metadata: { requestId: request.id, targetUserId: request.targetUserId, approvalReference } },
    });
    return updated;
  });
}

export async function rejectMfaRecoveryRequest(input: { actorId: string; requestId: string; reason: string }) {
  if (!(await activeAuthority(input.actorId, MfaRecoveryAuthorityRole.ICT_SECURITY_APPROVER))) {
    throw new Error("Only an appointed ICT Security approver can reject this request.");
  }
  const reason = cleanReference(input.reason);
  return prisma.$transaction(async (transaction) => {
    const request = await transaction.mfaRecoveryRequest.findUnique({ where: { id: input.requestId } });
    if (!request || request.status !== MfaRecoveryRequestStatus.PENDING_SECURITY_APPROVAL) throw new Error("The request is not awaiting approval.");
    await transaction.mfaRecoveryRequest.update({ where: { id: request.id }, data: { status: MfaRecoveryRequestStatus.REJECTED, rejectionReason: reason } });
    await transaction.auditLog.create({ data: { actorId: input.actorId, action: AuditAction.MFA_RECOVERY_REQUEST_REJECTED, metadata: { requestId: request.id, reason } } });
  });
}

export async function executeMfaRecoveryRequest(input: {
  actorId: string;
  actorWorkspaceRole: WorkspaceRole;
  requestId: string;
}) {
  const recoveryOperator = await activeAuthority(input.actorId, MfaRecoveryAuthorityRole.ICT_RECOVERY_OPERATOR);
  if (!canExecuteRecovery(input.actorWorkspaceRole, recoveryOperator?.role)) {
    throw new Error("Only a SYSTEM_ADMIN or appointed ICT Recovery Operator can execute recovery.");
  }
  const now = new Date();
  const result = await prisma.$transaction(async (transaction) => {
    const request = await transaction.mfaRecoveryRequest.findUnique({
      where: { id: input.requestId },
      include: { targetUser: { select: { email: true, fullName: true, workspaceRole: true } } },
    });
    if (!request || request.status !== MfaRecoveryRequestStatus.APPROVED || request.expiresAt <= now) {
      throw new Error("The recovery request is unavailable, unapproved or expired.");
    }
    assertIndependentRecoveryExecutor({ actorId: input.actorId, targetUserId: request.targetUserId, identityVerifierId: request.identityVerifiedById, securityApproverId: request.securityApprovedById });
    if (request.targetUser.workspaceRole !== WorkspaceRole.STAFF && !request.securityApprovedById) {
      throw new Error("Privileged-account recovery requires ICT Security approval.");
    }
    await transaction.user.update({
      where: { id: request.targetUserId },
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
    await transaction.mfaRecoveryCode.deleteMany({ where: { userId: request.targetUserId } });
    const revoked = await revokeWorkspaceSessionsInTransaction(transaction, { userId: request.targetUserId }, WorkspaceSessionRevocationReason.MFA_RECOVERY, now);
    await transaction.mfaRecoveryRequest.update({ where: { id: request.id }, data: { status: MfaRecoveryRequestStatus.COMPLETED, executedById: input.actorId, executedAt: now } });
    await transaction.auditLog.create({
      data: { actorId: input.actorId, action: AuditAction.MFA_RECOVERY_COMPLETED, metadata: { requestId: request.id, targetUserId: request.targetUserId, method: "assisted", revokedSessions: revoked.count } },
    });
    return { eventIds: revoked.eventIds, target: request.targetUser, targetUserId: request.targetUserId };
  });
  await deliverItfFlowSessionEvents(result.eventIds);
  let notificationDelivered = true;
  try {
    await sendWorkspaceSecurityEmail({
      to: result.target.email,
      fullName: result.target.fullName,
      subject: "ITF Workspace authenticator recovery completed",
      message: "Your previous authenticator and recovery codes were invalidated, and all sessions were terminated. Sign in with your password and enroll a new authenticator.",
    });
  } catch {
    notificationDelivered = false;
  }
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: notificationDelivered ? AuditAction.SECURITY_NOTIFICATION_SENT : AuditAction.SECURITY_NOTIFICATION_FAILED,
      metadata: { targetUserId: result.targetUserId, event: "MFA_RECOVERY_COMPLETED" },
    },
  });
  return { notificationDelivered };
}
