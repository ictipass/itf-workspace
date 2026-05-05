import { DefaultSession } from "next-auth";
import { UserStatus, WorkspaceRole } from "@prisma/client";

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
  }
}