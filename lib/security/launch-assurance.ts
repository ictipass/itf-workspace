import {
  AssuranceRequirement,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";

export function effectiveLaunchAssurance(
  workspaceRole: WorkspaceRole,
  appRequirement: AssuranceRequirement,
  roleRequirement: AssuranceRequirement
) {
  return workspaceRole === WorkspaceRole.SYSTEM_ADMIN ||
    workspaceRole === WorkspaceRole.APP_ADMIN ||
    appRequirement === AssuranceRequirement.SENSITIVE ||
    roleRequirement === AssuranceRequirement.SENSITIVE
    ? AssuranceRequirement.SENSITIVE
    : AssuranceRequirement.STANDARD;
}

export function hasFreshMfa(
  mfaAuthenticatedAt: Date | null | undefined,
  freshnessSeconds: number,
  now = new Date()
) {
  if (!mfaAuthenticatedAt) return false;
  const age = now.getTime() - mfaAuthenticatedAt.getTime();
  return age >= 0 && age <= freshnessSeconds * 1000;
}
