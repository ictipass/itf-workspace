import { DefaultSession } from "next-auth";
import { UserStatus, WorkspaceRole } from "@/lib/generated/prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
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
    workspaceSessionId: string;
    workspaceSessionIdleExpiresAt: Date;
    workspaceSessionAbsoluteExpiresAt: Date;
  }

  interface Session {
    user: {
      id: string;
      staffNumber?: string | null;
      workspaceRole: WorkspaceRole;
      status: UserStatus;
      isTemporaryPassword: boolean;
      officeId?: string | null;
      departmentId?: string | null;
      divisionId?: string | null;
      unitId?: string | null;
      positionId?: string | null;
      totpEnrolledAt?: string | null;
      workspaceSessionId: string;
      workspaceSessionIdleExpiresAt: string;
      workspaceSessionAbsoluteExpiresAt: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    staffNumber?: string | null;
    workspaceRole: WorkspaceRole;
    status: UserStatus;
    isTemporaryPassword: boolean;
    officeId?: string | null;
    departmentId?: string | null;
    divisionId?: string | null;
    unitId?: string | null;
    positionId?: string | null;
    totpEnrolledAt?: string | null;
    workspaceSessionId: string;
    workspaceSessionIdleExpiresAt: string;
    workspaceSessionAbsoluteExpiresAt: string;
  }
}
