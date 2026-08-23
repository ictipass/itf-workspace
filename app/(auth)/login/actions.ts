"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";
import {
  authenticateWorkspaceCredentials,
  createSessionRecoveryGrant,
} from "@/lib/auth/workspace-session.service";
import { setSessionRecoveryCookie } from "@/lib/auth/session-recovery-cookie";

export type LoginActionState = { error?: string };

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  callbackUrl: z.string().startsWith("/").default("/dashboard"),
});

export async function loginAction(
  _state: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email address and password." };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: parsed.data.callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      if ((error as CredentialsSignin).code === "session_limit") {
        const user = await authenticateWorkspaceCredentials(
          parsed.data.email,
          parsed.data.password
        );
        if (!user) return { error: "Invalid email or password." };
        const grant = await createSessionRecoveryGrant(user.id);
        await setSessionRecoveryCookie(grant.token, grant.expiresAt);
        redirect("/session-recovery");
      }
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  return {};
}
