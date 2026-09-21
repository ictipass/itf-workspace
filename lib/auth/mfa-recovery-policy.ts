import {
  MfaRecoveryAuthorityRole,
  MfaRecoveryRequestStatus,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";

export function initialRecoveryStatus(role: WorkspaceRole) {
  return role === WorkspaceRole.STAFF
    ? MfaRecoveryRequestStatus.APPROVED
    : MfaRecoveryRequestStatus.PENDING_SECURITY_APPROVAL;
}

export function assertIndependentSecurityApprover(input: {
  actorId: string;
  targetUserId: string;
  identityVerifierId: string;
}) {
  if (input.actorId === input.targetUserId || input.actorId === input.identityVerifierId) {
    throw new Error("The security approver must be independent of the user and HR verifier.");
  }
}

export function assertIndependentRecoveryExecutor(input: {
  actorId: string;
  targetUserId: string;
  identityVerifierId: string;
  securityApproverId?: string | null;
}) {
  if (
    input.actorId === input.targetUserId ||
    input.actorId === input.identityVerifierId ||
    input.actorId === input.securityApproverId
  ) {
    throw new Error("The recovery executor must be independent of the user, HR verifier and security approver.");
  }
}

export function canExecuteRecovery(
  workspaceRole: WorkspaceRole,
  authorityRole?: MfaRecoveryAuthorityRole | null
) {
  return workspaceRole === WorkspaceRole.SYSTEM_ADMIN || authorityRole === MfaRecoveryAuthorityRole.ICT_RECOVERY_OPERATOR;
}
