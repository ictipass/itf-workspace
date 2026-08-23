"use server";

import { redirect } from "next/navigation";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  verifyTotpStepUp,
} from "@/lib/auth/workspace-mfa.service";
import { createTotpQrCodeDataUrl } from "@/lib/security/totp-qr";

export type MfaActionState = {
  error?: string;
  secret?: string;
  qrCodeDataUrl?: string;
  expiresAt?: string;
};

function safeReturnTo(value: FormDataEntryValue | null) {
  const target = String(value ?? "/dashboard");
  return target.startsWith("/dashboard") && !target.startsWith("//")
    ? target
    : "/dashboard";
}

export async function beginEnrollmentAction(
  _state: MfaActionState
): Promise<MfaActionState> {
  void _state;
  const context = await getCurrentSessionContext();
  if (!context) return { error: "Your Workspace session is no longer active." };
  try {
    const challenge = await beginTotpEnrollment(context.user.id);
    let qrCodeDataUrl: string | undefined;
    try {
      qrCodeDataUrl = await createTotpQrCodeDataUrl(challenge.provisioningUri);
    } catch {
      // Enrollment remains possible through the manual key if local QR
      // rendering is unexpectedly unavailable.
    }
    return {
      secret: challenge.secret,
      qrCodeDataUrl,
      expiresAt: challenge.expiresAt.toISOString(),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Enrollment could not start." };
  }
}

export async function confirmEnrollmentAction(
  _state: MfaActionState,
  formData: FormData
): Promise<MfaActionState> {
  const context = await getCurrentSessionContext();
  if (!context) return { error: "Your Workspace session is no longer active." };
  try {
    await confirmTotpEnrollment({
      userId: context.user.id,
      workspaceSessionId: context.session.id,
      code: String(formData.get("code") ?? ""),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Enrollment failed." };
  }
  redirect(safeReturnTo(formData.get("returnTo")));
}

export async function verifyMfaAction(
  _state: MfaActionState,
  formData: FormData
): Promise<MfaActionState> {
  const context = await getCurrentSessionContext();
  if (!context) return { error: "Your Workspace session is no longer active." };
  try {
    await verifyTotpStepUp({
      userId: context.user.id,
      workspaceSessionId: context.session.id,
      code: String(formData.get("code") ?? ""),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Verification failed." };
  }
  redirect(safeReturnTo(formData.get("returnTo")));
}
