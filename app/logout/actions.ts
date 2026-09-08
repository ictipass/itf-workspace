"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { revokeWorkspaceSession } from "@/lib/auth/workspace-session.service";
import {
  AuditAction,
  WorkspaceSessionRevocationReason,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function signOutWorkspaceAndAppsAction() {
  const context = await getCurrentSessionContext();
  if (!context) redirect("/login?reason=sessionExpired");

  await revokeWorkspaceSession(
    context.session.id,
    context.user.id,
    WorkspaceSessionRevocationReason.USER_SIGN_OUT
  );
  await prisma.auditLog.create({
    data: {
      actorId: context.user.id,
      action: AuditAction.LOGOUT,
      metadata: {
        scope: "CURRENT_WORKSPACE_SESSION_AND_CONNECTED_APPS",
        workspaceSessionId: context.session.id,
      },
    },
  });
  await signOut({ redirectTo: "/login" });
}
