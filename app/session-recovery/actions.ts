"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import {
  clearSessionRecoveryCookie,
  getSessionRecoveryCookie,
} from "@/lib/auth/session-recovery-cookie";

export async function recoverSessionAction(formData: FormData) {
  const token = await getSessionRecoveryCookie();
  if (!token) redirect("/login?reason=recoveryExpired");

  let destination: string | undefined;
  try {
    destination = await signIn("session-recovery", {
      grantToken: token,
      terminateSessionId: String(formData.get("terminateSessionId") ?? ""),
      redirect: false,
      redirectTo: "/dashboard",
    });
  } catch {
    await clearSessionRecoveryCookie();
    redirect("/login?reason=recoveryExpired");
  }
  await clearSessionRecoveryCookie();
  redirect(destination || "/dashboard");
}
