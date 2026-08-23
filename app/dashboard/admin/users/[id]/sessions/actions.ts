"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { WorkspaceRole, WorkspaceSessionRevocationReason } from "@/lib/generated/prisma/client";
import { revokeAllWorkspaceSessions, revokeWorkspaceSession } from "@/lib/auth/workspace-session.service";

async function requireSystemAdminContext() {
  const context = await getCurrentSessionContext();
  if (!context || context.user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) throw new Error("Unauthorized");
  return context;
}

export async function terminateUserSessionAction(formData: FormData) {
  const actor = await requireSystemAdminContext();
  const userId = String(formData.get("userId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!userId || !sessionId) throw new Error("User and session IDs are required.");
  await revokeWorkspaceSession(
    sessionId,
    userId,
    WorkspaceSessionRevocationReason.ADMIN_TERMINATED,
    actor.user.id
  );
  if (sessionId === actor.session.id) await signOut({ redirectTo: "/login" });
  revalidatePath(`/dashboard/admin/users/${userId}/sessions`);
}

export async function terminateAllUserSessionsAction(formData: FormData) {
  const actor = await requireSystemAdminContext();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("User ID is required.");
  await revokeAllWorkspaceSessions(
    userId,
    WorkspaceSessionRevocationReason.ADMIN_TERMINATED,
    actor.user.id
  );
  if (userId === actor.user.id) await signOut({ redirectTo: "/login" });
  revalidatePath(`/dashboard/admin/users/${userId}/sessions`);
}
