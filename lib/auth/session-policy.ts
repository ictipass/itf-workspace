import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { resolveWorkspaceSessionPolicy } from "@/lib/config/workspace-environment";

export type WorkspaceSessionState =
  | "ACTIVE"
  | "REVOKED"
  | "IDLE_EXPIRED"
  | "ABSOLUTE_EXPIRED";

export type SessionTiming = {
  authenticatedAt: Date;
  lastActivityAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
};

export function getIdleTimeoutSeconds(role: WorkspaceRole) {
  const policy = resolveWorkspaceSessionPolicy();
  return role === WorkspaceRole.STAFF
    ? policy.staffIdleSeconds
    : policy.privilegedIdleSeconds;
}

export function createSessionTiming(role: WorkspaceRole, now = new Date()): SessionTiming {
  const policy = resolveWorkspaceSessionPolicy();

  return {
    authenticatedAt: now,
    lastActivityAt: now,
    idleExpiresAt: new Date(now.getTime() + getIdleTimeoutSeconds(role) * 1000),
    absoluteExpiresAt: new Date(now.getTime() + policy.absoluteSeconds * 1000),
  };
}

export function classifyWorkspaceSession(
  session: Pick<SessionTiming, "idleExpiresAt" | "absoluteExpiresAt"> & {
    revokedAt?: Date | null;
  },
  now = new Date()
): WorkspaceSessionState {
  if (session.revokedAt) return "REVOKED";
  if (session.absoluteExpiresAt.getTime() <= now.getTime()) {
    return "ABSOLUTE_EXPIRED";
  }
  if (session.idleExpiresAt.getTime() <= now.getTime()) return "IDLE_EXPIRED";
  return "ACTIVE";
}

export function nextIdleExpiry(
  role: WorkspaceRole,
  absoluteExpiresAt: Date,
  now = new Date()
) {
  const idleExpiry = new Date(now.getTime() + getIdleTimeoutSeconds(role) * 1000);
  return idleExpiry.getTime() < absoluteExpiresAt.getTime()
    ? idleExpiry
    : absoluteExpiresAt;
}
