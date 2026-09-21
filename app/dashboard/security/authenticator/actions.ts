"use server";

import { getCurrentSessionContext, requireFreshMfaContext } from "@/lib/auth/current-user";
import {
  beginTotpReplacement,
  confirmTotpReplacement,
  regenerateRecoveryCodes,
} from "@/lib/auth/workspace-mfa.service";
import { createTotpQrCodeDataUrl } from "@/lib/security/totp-qr";

export type AuthenticatorActionState = {
  error?: string;
  secret?: string;
  qrCodeDataUrl?: string;
  expiresAt?: string;
  recoveryCodes?: string[];
  signedOut?: boolean;
};

export async function beginReplacementAction(
  _state: AuthenticatorActionState,
  formData: FormData
): Promise<AuthenticatorActionState> {
  const context = await getCurrentSessionContext();
  if (!context) return { error: "Your Workspace session is no longer active." };
  try {
    const challenge = await beginTotpReplacement({
      userId: context.user.id,
      workspaceSessionId: context.session.id,
      currentPassword: String(formData.get("currentPassword") ?? ""),
      currentCode: String(formData.get("currentCode") ?? ""),
    });
    return {
      secret: challenge.secret,
      expiresAt: challenge.expiresAt.toISOString(),
      qrCodeDataUrl: await createTotpQrCodeDataUrl(challenge.provisioningUri),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Replacement could not start." };
  }
}

export async function confirmReplacementAction(
  _state: AuthenticatorActionState,
  formData: FormData
): Promise<AuthenticatorActionState> {
  const context = await getCurrentSessionContext();
  if (!context) return { error: "Your Workspace session is no longer active." };
  try {
    const recoveryCodes = await confirmTotpReplacement({
      userId: context.user.id,
      code: String(formData.get("newCode") ?? ""),
    });
    return { recoveryCodes, signedOut: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Replacement failed." };
  }
}

export async function regenerateRecoveryCodesAction(): Promise<AuthenticatorActionState> {
  try {
    const context = await requireFreshMfaContext();
    return { recoveryCodes: await regenerateRecoveryCodes(context.user.id) };
  } catch (error) {
    return {
      error: error instanceof Error && error.message === "FRESH_MFA_REQUIRED"
        ? "Verify your authenticator again, then retry."
        : "Recovery codes could not be regenerated.",
    };
  }
}
