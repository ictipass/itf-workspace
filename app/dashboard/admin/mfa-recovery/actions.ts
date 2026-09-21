"use server";

import { revalidatePath } from "next/cache";
import { MfaRecoveryAuthorityRole, WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireFreshMfaContext } from "@/lib/auth/current-user";
import {
  approveMfaRecoveryRequest,
  createMfaRecoveryRequest,
  executeMfaRecoveryRequest,
  grantMfaRecoveryAuthority,
  rejectMfaRecoveryRequest,
  revokeMfaRecoveryAuthority,
} from "@/lib/auth/mfa-assisted-recovery.service";

export type RecoveryOperationState = { success?: string; error?: string };

async function run(operation: () => Promise<string | void>): Promise<RecoveryOperationState> {
  try {
    const success = await operation();
    revalidatePath("/dashboard/admin/mfa-recovery");
    return { success: success || "The recovery operation was recorded." };
  } catch (error) {
    return { error: error instanceof Error && error.message === "FRESH_MFA_REQUIRED" ? "Verify your authenticator again, then resubmit the reviewed operation." : error instanceof Error ? error.message : "The recovery operation failed." };
  }
}

export async function grantAuthorityAction(_state: RecoveryOperationState, formData: FormData) {
  return run(async () => {
    const context = await requireFreshMfaContext();
    if (context.user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) throw new Error("Only SYSTEM_ADMIN can appoint recovery authorities.");
    await grantMfaRecoveryAuthority({
      actorId: context.user.id,
      userId: String(formData.get("userId") ?? ""),
      role: String(formData.get("role")) as MfaRecoveryAuthorityRole,
      approvalReference: String(formData.get("approvalReference") ?? ""),
    });
    return "Recovery authority assigned.";
  });
}

export async function revokeAuthorityAction(formData: FormData) {
  await run(async () => {
    const context = await requireFreshMfaContext();
    if (context.user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) throw new Error("Only SYSTEM_ADMIN can revoke recovery authorities.");
    await revokeMfaRecoveryAuthority({ actorId: context.user.id, authorityId: String(formData.get("authorityId") ?? "") });
  });
}

export async function createRecoveryRequestAction(_state: RecoveryOperationState, formData: FormData) {
  return run(async () => {
    const context = await requireFreshMfaContext();
    await createMfaRecoveryRequest({
      actorId: context.user.id,
      targetUserId: String(formData.get("targetUserId") ?? ""),
      identityVerificationReference: String(formData.get("identityVerificationReference") ?? ""),
    });
    return "In-person identity verification recorded and recovery request created.";
  });
}

export async function approveRecoveryRequestAction(_state: RecoveryOperationState, formData: FormData) {
  return run(async () => {
    const context = await requireFreshMfaContext();
    await approveMfaRecoveryRequest({ actorId: context.user.id, requestId: String(formData.get("requestId") ?? ""), approvalReference: String(formData.get("approvalReference") ?? "") });
    return "Privileged recovery approved.";
  });
}

export async function rejectRecoveryRequestAction(_state: RecoveryOperationState, formData: FormData) {
  return run(async () => {
    const context = await requireFreshMfaContext();
    await rejectMfaRecoveryRequest({ actorId: context.user.id, requestId: String(formData.get("requestId") ?? ""), reason: String(formData.get("reason") ?? "") });
    return "Recovery request rejected.";
  });
}

export async function executeRecoveryRequestAction(_state: RecoveryOperationState, formData: FormData) {
  return run(async () => {
    const context = await requireFreshMfaContext();
    const result = await executeMfaRecoveryRequest({ actorId: context.user.id, actorWorkspaceRole: context.user.workspaceRole, requestId: String(formData.get("requestId") ?? "") });
    return result.notificationDelivered
      ? "Recovery completed, sessions terminated and the user notified."
      : "Recovery completed and sessions terminated, but email notification failed. Contact the user through an approved channel and record the delivery incident.";
  });
}
