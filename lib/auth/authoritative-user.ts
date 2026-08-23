import { UserStatus, WorkspaceRole } from "@/lib/generated/prisma/client";

export type AuthoritativeWorkspaceUserRecord = {
  id: string;
  fullName?: string | null;
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
  totpEnrolledAt?: Date | null;
};

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
  totpEnrolledAt?: Date | null;
};

export function resolveAuthoritativeWorkspaceUser(
  user: AuthoritativeWorkspaceUserRecord | null
): CurrentWorkspaceUser | null {
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
    totpEnrolledAt: user.totpEnrolledAt,
  };
}
