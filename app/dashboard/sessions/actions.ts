"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { WorkspaceSessionRevocationReason } from "@/lib/generated/prisma/client";
import {
  revokeAllWorkspaceSessions,
  revokeWorkspaceSession,
} from "@/lib/auth/workspace-session.service";

export async function terminateOwnSessionAction(formData: FormData) {
  const context = await getCurrentSessionContext();
  if (!context) throw new Error("Unauthenticated");
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) throw new Error("Session ID is required.");

  await revokeWorkspaceSession(
    sessionId,
    context.user.id,
    WorkspaceSessionRevocationReason.USER_TERMINATED
  );
  if (sessionId === context.session.id) await signOut({ redirectTo: "/login" });
  revalidatePath("/dashboard/sessions");
}

export async function terminateAllOwnSessionsAction() {
  const context = await getCurrentSessionContext();
  if (!context) throw new Error("Unauthenticated");
  await revokeAllWorkspaceSessions(
    context.user.id,
    WorkspaceSessionRevocationReason.USER_TERMINATED
  );
  await signOut({ redirectTo: "/login" });
}
