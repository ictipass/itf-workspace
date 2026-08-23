import { WorkspaceRole } from "@/lib/generated/prisma/client";

export const HR_MASTER_LIST_WORKSPACE_ROLE = WorkspaceRole.STAFF;

export function isPermittedHrMasterListWorkspaceRole(role: string) {
  return role === HR_MASTER_LIST_WORKSPACE_ROLE;
}
