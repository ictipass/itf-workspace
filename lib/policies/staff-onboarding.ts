import { WorkspaceRole } from "@/lib/generated/prisma/client";

export const HR_MASTER_LIST_WORKSPACE_ROLE = WorkspaceRole.STAFF;

export type AppRolePolicyReference = {
  roleCode: string;
  isActive: boolean;
};

export function isPermittedHrMasterListWorkspaceRole(role: string) {
  return role === HR_MASTER_LIST_WORKSPACE_ROLE;
}

export function normalizeAppRoleCode(role: string) {
  return role.trim().toUpperCase();
}

export function isActiveClassifiedAppRole(
  role: string,
  policies: readonly AppRolePolicyReference[]
) {
  const normalizedRole = normalizeAppRoleCode(role);
  return policies.some(
    (policy) => policy.isActive && policy.roleCode === normalizedRole
  );
}
