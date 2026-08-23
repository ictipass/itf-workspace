import "server-only";

import { cache } from "react";
import { auth } from "@/auth";
import {
  resolveAuthoritativeWorkspaceUser,
  type CurrentWorkspaceUser,
} from "@/lib/auth/authoritative-user";
import { validateWorkspaceSession } from "@/lib/auth/workspace-session.service";

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
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return user;
}
