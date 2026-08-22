import "server-only";

import { cache } from "react";
import { auth } from "@/auth";
import { UserStatus, WorkspaceRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type CurrentWorkspaceUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  staffNumber?: string | null;
  workspaceRole: WorkspaceRole;
  status: UserStatus;
  isTemporaryPassword: boolean;
  officeId?: string | null;
  departmentId?: string | null;
  divisionId?: string | null;
  unitId?: string | null;
  positionId?: string | null;
};

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

  if (!user || user.status !== UserStatus.ACTIVE) return null;

  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    staffNumber: user.staffNumber,
    workspaceRole: user.workspaceRole,
    status: user.status,
    isTemporaryPassword: user.isTemporaryPassword,
    officeId: user.officeId,
    departmentId: user.departmentId,
    divisionId: user.divisionId,
    unitId: user.unitId,
    positionId: user.positionId,
  };
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return user;
}
