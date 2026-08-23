import "server-only";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  AuditAction,
  Prisma,
  UserStatus,
  WorkspaceSessionRevocationReason,
} from "@/lib/generated/prisma/client";
import { resolveWorkspaceSessionPolicy } from "@/lib/config/workspace-environment";
import {
  classifyWorkspaceSession,
  createSessionTiming,
  nextIdleExpiry,
} from "@/lib/auth/session-policy";
import { prisma } from "@/lib/prisma";
import {
  deliverItfFlowSessionEvents,
  revokeWorkspaceSessionsInTransaction,
} from "@/lib/integrations/itf-flow-session-events";

const authenticatedUserSelection = {
  id: true,
  fullName: true,
  email: true,
  passwordHash: true,
  staffNumber: true,
  workspaceRole: true,
  status: true,
  isTemporaryPassword: true,
  officeId: true,
  departmentId: true,
  divisionId: true,
  unitId: true,
  positionId: true,
  totpEnrolledAt: true,
} satisfies Prisma.UserSelect;

type AuthenticatedUserRecord = Prisma.UserGetPayload<{
  select: typeof authenticatedUserSelection;
}>;

export class WorkspaceSessionLimitError extends Error {
  constructor() {
    super("The maximum number of Workspace sessions has been reached.");
    this.name = "WorkspaceSessionLimitError";
  }
}

function hashRecoveryToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toAuthUser(
  user: AuthenticatedUserRecord,
  session: { id: string; idleExpiresAt: Date; absoluteExpiresAt: Date }
) {
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
    workspaceSessionId: session.id,
    workspaceSessionIdleExpiresAt: session.idleExpiresAt,
    workspaceSessionAbsoluteExpiresAt: session.absoluteExpiresAt,
  };
}

async function lockUser(transaction: Prisma.TransactionClient, userId: string) {
  await transaction.$queryRaw`
    SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE
  `;
}

function activeSessionWhere(userId: string, now: Date): Prisma.WorkspaceSessionWhereInput {
  return {
    userId,
    revokedAt: null,
    idleExpiresAt: { gt: now },
    absoluteExpiresAt: { gt: now },
  };
}

async function createSessionInTransaction(
  transaction: Prisma.TransactionClient,
  user: AuthenticatedUserRecord,
  now: Date
) {
  const policy = resolveWorkspaceSessionPolicy();
  await lockUser(transaction, user.id);

  const activeCount = await transaction.workspaceSession.count({
    where: activeSessionWhere(user.id, now),
  });
  if (activeCount >= policy.maxConcurrentSessions) {
    throw new WorkspaceSessionLimitError();
  }

  const session = await transaction.workspaceSession.create({
    data: { userId: user.id, ...createSessionTiming(user.workspaceRole, now) },
  });
  await transaction.auditLog.create({
    data: {
      actorId: user.id,
      action: AuditAction.LOGIN,
      metadata: { workspaceRole: user.workspaceRole, workspaceSessionId: session.id },
    },
  });
  return session;
}

export async function authenticateWorkspaceCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: authenticatedUserSelection,
  });

  if (!user || user.status !== UserStatus.ACTIVE || !user.passwordHash) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}

export async function createWorkspaceSession(user: AuthenticatedUserRecord) {
  const now = new Date();
  const session = await prisma.$transaction((transaction) =>
    createSessionInTransaction(transaction, user, now)
  );
  return toAuthUser(user, session);
}

export async function createSessionRecoveryGrant(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const policy = resolveWorkspaceSessionPolicy();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + policy.recoveryGrantSeconds * 1000);

  await prisma.$transaction(async (transaction) => {
    await transaction.workspaceSessionRecoveryGrant.deleteMany({
      where: { userId, OR: [{ expiresAt: { lte: now } }, { consumedAt: { not: null } }] },
    });
    await transaction.workspaceSessionRecoveryGrant.create({
      data: { userId, tokenHash: hashRecoveryToken(token), expiresAt },
    });
  });

  return { token, expiresAt };
}

export async function getSessionRecoveryContext(token: string) {
  const now = new Date();
  const grant = await prisma.workspaceSessionRecoveryGrant.findUnique({
    where: { tokenHash: hashRecoveryToken(token) },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
  if (!grant || grant.consumedAt || grant.expiresAt <= now) return null;

  const sessions = await prisma.workspaceSession.findMany({
    where: activeSessionWhere(grant.userId, now),
    orderBy: { lastActivityAt: "asc" },
  });
  return { user: grant.user, expiresAt: grant.expiresAt, sessions };
}

export async function recoverWorkspaceSession(token: string, terminateSessionId?: string) {
  const now = new Date();
  const result = await prisma.$transaction(async (transaction) => {
    const grant = await transaction.workspaceSessionRecoveryGrant.findUnique({
      where: { tokenHash: hashRecoveryToken(token) },
    });
    if (!grant || grant.consumedAt || grant.expiresAt <= now) return null;

    await lockUser(transaction, grant.userId);
    const user = await transaction.user.findUnique({
      where: { id: grant.userId },
      select: authenticatedUserSelection,
    });
    if (!user || user.status !== UserStatus.ACTIVE) return null;

    const revokeWhere: Prisma.WorkspaceSessionWhereInput = terminateSessionId
      ? { ...activeSessionWhere(user.id, now), id: terminateSessionId }
      : activeSessionWhere(user.id, now);
    const revoked = await revokeWorkspaceSessionsInTransaction(
      transaction,
      revokeWhere,
      WorkspaceSessionRevocationReason.SESSION_LIMIT_RECOVERY,
      now
    );
    if (revoked.count === 0) return null;

    const session = await createSessionInTransaction(transaction, user, now);
    await transaction.workspaceSessionRecoveryGrant.update({
      where: { id: grant.id },
      data: { consumedAt: now },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.SESSION_TERMINATED,
        metadata: { mode: terminateSessionId ? "selected" : "all", replacementSessionId: session.id },
      },
    });
    return { user: toAuthUser(user, session), eventIds: revoked.eventIds };
  });
  if (!result) return null;
  await deliverItfFlowSessionEvents(result.eventIds);
  return result.user;
}

export async function validateWorkspaceSession(sessionId: string, userId: string) {
  const now = new Date();
  const session = await prisma.workspaceSession.findUnique({
    where: { id: sessionId },
    include: { user: { select: authenticatedUserSelection } },
  });
  if (!session || session.userId !== userId || session.user.status !== UserStatus.ACTIVE) return null;

  // A promotion into a privileged role must shorten an existing session's
  // effective idle window immediately; a stale JWT or stored staff timeout
  // cannot preserve the less restrictive policy.
  const roleAdjustedIdleExpiry = nextIdleExpiry(
    session.user.workspaceRole,
    session.absoluteExpiresAt,
    session.lastActivityAt
  );
  const evaluatedSession = {
    ...session,
    idleExpiresAt:
      roleAdjustedIdleExpiry < session.idleExpiresAt
        ? roleAdjustedIdleExpiry
        : session.idleExpiresAt,
  };
  const state = classifyWorkspaceSession(evaluatedSession, now);
  if (state !== "ACTIVE") {
    if (!session.revokedAt) {
      const reason =
        state === "ABSOLUTE_EXPIRED"
          ? WorkspaceSessionRevocationReason.ABSOLUTE_TIMEOUT
          : WorkspaceSessionRevocationReason.IDLE_TIMEOUT;
      const revoked = await prisma.$transaction((transaction) =>
        revokeWorkspaceSessionsInTransaction(
          transaction,
          { id: session.id, userId },
          reason,
          now
        )
      );
      await deliverItfFlowSessionEvents(revoked.eventIds);
    }
    return null;
  }
  return evaluatedSession;
}

export async function recordWorkspaceActivity(sessionId: string, userId: string) {
  const session = await validateWorkspaceSession(sessionId, userId);
  if (!session) return null;
  const now = new Date();
  const idleExpiresAt = nextIdleExpiry(session.user.workspaceRole, session.absoluteExpiresAt, now);
  return prisma.workspaceSession.update({
    where: { id: session.id },
    data: { lastActivityAt: now, idleExpiresAt },
  });
}

export async function revokeWorkspaceSession(
  sessionId: string,
  userId: string,
  reason: WorkspaceSessionRevocationReason,
  actorId = userId
) {
  const result = await prisma.$transaction(async (transaction) => {
    const revoked = await revokeWorkspaceSessionsInTransaction(
      transaction,
      { id: sessionId, userId },
      reason
    );
    if (revoked.count) {
      await transaction.auditLog.create({
        data: { actorId, action: AuditAction.SESSION_TERMINATED, metadata: { sessionId, userId, reason } },
      });
    }
    return revoked;
  });
  await deliverItfFlowSessionEvents(result.eventIds);
  return result.count > 0;
}

export async function revokeAllWorkspaceSessions(
  userId: string,
  reason: WorkspaceSessionRevocationReason,
  actorId = userId
) {
  const result = await prisma.$transaction(async (transaction) => {
    const revoked = await revokeWorkspaceSessionsInTransaction(
      transaction,
      { userId },
      reason
    );
    if (revoked.count) {
      await transaction.auditLog.create({
        data: { actorId, action: AuditAction.SESSION_TERMINATED, metadata: { userId, reason, count: revoked.count } },
      });
    }
    return revoked;
  });
  await deliverItfFlowSessionEvents(result.eventIds);
  return result.count;
}

export async function listWorkspaceSessions(userId: string) {
  return prisma.workspaceSession.findMany({
    where: { userId },
    orderBy: { authenticatedAt: "desc" },
    take: 20,
  });
}
