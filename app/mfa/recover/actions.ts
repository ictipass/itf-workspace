"use server";

import { signOut } from "@/auth";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { recoverWithOneTimeCode } from "@/lib/auth/workspace-mfa.service";

export type RecoveryActionState = { error?: string };

export async function recoverWithCodeAction(
  _state: RecoveryActionState,
  formData: FormData
): Promise<RecoveryActionState> {
  const context = await getCurrentSessionContext();
  if (!context) return { error: "Sign in with your password before using a recovery code." };
  try {
    await recoverWithOneTimeCode({
      userId: context.user.id,
      password: String(formData.get("password") ?? ""),
      code: String(formData.get("recoveryCode") ?? ""),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Recovery could not be completed." };
  }
  await signOut({ redirectTo: "/login?recovery=completed" });
  return {};
}
