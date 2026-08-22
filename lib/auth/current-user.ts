import "server-only";

import { cache } from "react";
import { auth } from "@/auth";
import {
  resolveAuthoritativeWorkspaceUser,
  type CurrentWorkspaceUser,
} from "@/lib/auth/authoritative-user";
import { prisma } from "@/lib/prisma";

export type { CurrentWorkspaceUser } from "@/lib/auth/authoritative-user";

export const getCurrentUser = cache(async (): Promise<CurrentWorkspaceUser | null> => {
  const session = await auth();

  if (!session?.user?.id) return null;

  // JWT claims describe the user at sign-in time. Authorization must use the
  // current directory record so deactivation, suspension and role changes take
  // effect without waiting for the browser session to expire.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      staffNumber: true,
      workspaceRole: true,
      status: true,
      isTemporaryPassword: true,
      officeId: true,
      departmentId: true,
      divisionId: true,
      unitId: true,
      positionId: true,
    },
  });

  return resolveAuthoritativeWorkspaceUser(user);
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return user;
}
