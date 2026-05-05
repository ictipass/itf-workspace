import { auth } from "@/auth";
import { UserStatus, WorkspaceRole } from "@/lib/generated/prisma/client";

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

export async function getCurrentUser(): Promise<CurrentWorkspaceUser | null> {
  const session = await auth();

  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    staffNumber: session.user.staffNumber,
    workspaceRole: session.user.workspaceRole,
    status: session.user.status,
    isTemporaryPassword: session.user.isTemporaryPassword,
    officeId: session.user.officeId,
    departmentId: session.user.departmentId,
    divisionId: session.user.divisionId,
    unitId: session.user.unitId,
    positionId: session.user.positionId,
  };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return user;
}