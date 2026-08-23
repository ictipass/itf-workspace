import "server-only";

import { cache } from "react";
import { auth } from "@/auth";
import {
  resolveAuthoritativeWorkspaceUser,
  type CurrentWorkspaceUser,
} from "@/lib/auth/authoritative-user";
import { validateWorkspaceSession } from "@/lib/auth/workspace-session.service";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { hasFreshMfa } from "@/lib/security/launch-assurance";
import { resolveWorkspaceLaunchV2Configuration } from "@/lib/config/workspace-environment";

export type { CurrentWorkspaceUser } from "@/lib/auth/authoritative-user";

export const getCurrentSessionContext = cache(async () => {
  const session = await auth();

  if (!session?.user?.id || !session.user.workspaceSessionId) return null;

  const workspaceSession = await validateWorkspaceSession(
    session.user.workspaceSessionId,
    session.user.id
  );
  if (!workspaceSession) return null;

  const user = resolveAuthoritativeWorkspaceUser(workspaceSession.user);
  return user ? { user, session: workspaceSession } : null;
});

export const getCurrentUser = cache(async (): Promise<CurrentWorkspaceUser | null> =>
  (await getCurrentSessionContext())?.user ?? null
);

export async function requireCurrentUser() {
  const context = await getCurrentSessionContext();
  const user = context?.user;

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  if (
    (user.workspaceRole === WorkspaceRole.SYSTEM_ADMIN ||
      user.workspaceRole === WorkspaceRole.APP_ADMIN) &&
    !context.session.mfaAuthenticatedAt
  ) {
    throw new Error("MFA_REQUIRED");
  }

  return user;
}

export async function requireFreshMfaContext() {
  const context = await getCurrentSessionContext();
  if (!context) throw new Error("UNAUTHENTICATED");
  const { stepUpSeconds } = resolveWorkspaceLaunchV2Configuration();
  if (!hasFreshMfa(context.session.mfaAuthenticatedAt, stepUpSeconds)) {
    throw new Error("FRESH_MFA_REQUIRED");
  }
  return context;
}
