import "server-only";

import { randomUUID } from "node:crypto";
import {
  IntegrationOutboxEventType,
  IntegrationOutboxStatus,
  Prisma,
  WorkspaceSessionRevocationReason,
} from "@/lib/generated/prisma/client";
import {
  resolveItfFlowSessionEventConfiguration,
  WorkspaceConfigurationError,
  type WorkspaceEnvironmentSource,
} from "@/lib/config/workspace-environment";
import { prisma } from "@/lib/prisma";
import {
  buildItfFlowSessionEventPayload,
  retryDelaySeconds,
} from "@/lib/integrations/outbox-policy";

type RevocableSession = { id: string; userId: string };

export function isItfFlowAppSlug(
  slug: string,
  environment: WorkspaceEnvironmentSource = process.env
) {
  return slug === (environment.ITF_FLOW_APP_SLUG?.trim() || "itf-flow");
}

export async function enqueueCentralLogoutEvents(
  transaction: Prisma.TransactionClient,
  sessions: readonly RevocableSession[],
  reason: WorkspaceSessionRevocationReason | string
) {
  if (sessions.length === 0) return [];
  const events = sessions.map((session) => ({
    eventId: randomUUID(),
    targetAppSlug: process.env.ITF_FLOW_APP_SLUG?.trim() || "itf-flow",
    type: IntegrationOutboxEventType.CENTRAL_LOGOUT,
    workspaceUserId: session.userId,
    workspaceSessionId: session.id,
    reason: String(reason),
  }));
  await transaction.integrationOutboxEvent.createMany({ data: events });
  return events.map((event) => event.eventId);
}

export async function enqueueCentralLogoutForWorkspaceUsers(
  transaction: Prisma.TransactionClient,
  workspaceUserIds: readonly string[],
  reason: string
) {
  if (workspaceUserIds.length === 0) return [];
  const sessions = await transaction.workspaceSession.findMany({
    where: { userId: { in: [...workspaceUserIds] }, revokedAt: null },
    select: { id: true, userId: true },
  });
  return enqueueCentralLogoutEvents(transaction, sessions, reason);
}

export async function enqueueEntitlementRevocationEvent(
  transaction: Prisma.TransactionClient,
  input: { workspaceUserId: string; appSlug: string; reason: string }
) {
  if (!isItfFlowAppSlug(input.appSlug)) return [];
  const eventId = randomUUID();
  await transaction.integrationOutboxEvent.create({
    data: {
      eventId,
      targetAppSlug: input.appSlug,
      type: IntegrationOutboxEventType.ENTITLEMENT_REVOKED,
      workspaceUserId: input.workspaceUserId,
      reason: input.reason,
    },
  });
  return [eventId];
}

export async function enqueueEntitlementRevocationEvents(
  transaction: Prisma.TransactionClient,
  inputs: readonly { workspaceUserId: string; appSlug: string; reason: string }[]
) {
  const events = inputs
    .filter((input) => isItfFlowAppSlug(input.appSlug))
    .map((input) => ({
      eventId: randomUUID(),
      targetAppSlug: input.appSlug,
      type: IntegrationOutboxEventType.ENTITLEMENT_REVOKED,
      workspaceUserId: input.workspaceUserId,
      reason: input.reason,
    }));
  if (events.length) await transaction.integrationOutboxEvent.createMany({ data: events });
  return events.map((event) => event.eventId);
}

export async function revokeWorkspaceSessionsInTransaction(
  transaction: Prisma.TransactionClient,
  where: Prisma.WorkspaceSessionWhereInput,
  reason: WorkspaceSessionRevocationReason,
  now = new Date()
) {
  const sessions = await transaction.workspaceSession.findMany({
    where: { ...where, revokedAt: null },
    select: { id: true, userId: true },
  });
  if (sessions.length === 0) return { count: 0, eventIds: [] as string[] };

  await transaction.workspaceSession.updateMany({
    where: { id: { in: sessions.map((session) => session.id) }, revokedAt: null },
    data: { revokedAt: now, revokeReason: reason },
  });
  const eventIds = await enqueueCentralLogoutEvents(transaction, sessions, reason);
  return { count: sessions.length, eventIds };
}

type ClaimedEvent = {
  id: string;
  eventId: string;
  type: IntegrationOutboxEventType;
  workspaceUserId: string;
  workspaceSessionId: string | null;
  reason: string;
  targetAppSlug: string;
  createdAt: Date;
  attemptCount: number;
  leaseId: string;
};

async function claimEvents(eventIds?: readonly string[]) {
  const configuration = resolveItfFlowSessionEventConfiguration();
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + configuration.leaseSeconds * 1000);

  return prisma.$transaction(async (transaction) => {
    const candidates = await transaction.integrationOutboxEvent.findMany({
      where: {
        targetAppSlug: configuration.appSlug,
        ...(eventIds?.length ? { eventId: { in: [...eventIds] } } : {}),
        OR: [
          { status: IntegrationOutboxStatus.PENDING, availableAt: { lte: now } },
          { status: IntegrationOutboxStatus.RETRY, availableAt: { lte: now } },
          { status: IntegrationOutboxStatus.PROCESSING, leaseExpiresAt: { lte: now } },
        ],
      },
      orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
      take: configuration.batchSize,
    });

    const claimed: ClaimedEvent[] = [];
    for (const candidate of candidates) {
      const leaseId = randomUUID();
      const result = await transaction.integrationOutboxEvent.updateMany({
        where: {
          id: candidate.id,
          OR: [
            { status: IntegrationOutboxStatus.PENDING, availableAt: { lte: now } },
            { status: IntegrationOutboxStatus.RETRY, availableAt: { lte: now } },
            { status: IntegrationOutboxStatus.PROCESSING, leaseExpiresAt: { lte: now } },
          ],
        },
        data: { status: IntegrationOutboxStatus.PROCESSING, leaseId, leaseExpiresAt },
      });
      if (result.count === 1) claimed.push({ ...candidate, leaseId });
    }
    return claimed;
  });
}

async function deliverClaimedEvent(event: ClaimedEvent) {
  const configuration = resolveItfFlowSessionEventConfiguration();
  const attemptCount = event.attemptCount + 1;
  try {
    if (event.type === IntegrationOutboxEventType.CENTRAL_LOGOUT && !event.workspaceSessionId) {
      throw new Error("A central logout event is missing its Workspace session identifier.");
    }
    const payload = event.type === IntegrationOutboxEventType.CENTRAL_LOGOUT
      ? buildItfFlowSessionEventPayload({
          eventId: event.eventId,
          type: "CENTRAL_LOGOUT",
          workspaceUserId: event.workspaceUserId,
          workspaceSessionId: event.workspaceSessionId!,
          targetAppSlug: event.targetAppSlug,
          occurredAt: event.createdAt,
          reason: event.reason,
        })
      : buildItfFlowSessionEventPayload({
          eventId: event.eventId,
          type: "ENTITLEMENT_REVOKED",
          workspaceUserId: event.workspaceUserId,
          targetAppSlug: event.targetAppSlug,
          occurredAt: event.createdAt,
          reason: event.reason,
        });
    const response = await fetch(configuration.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.secret}`,
        "Content-Type": "application/json",
        "X-Correlation-Id": event.eventId,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(configuration.requestTimeoutMs),
    });
    const result = (await response.json().catch(() => null)) as { accepted?: boolean } | null;
    if (!response.ok || result?.accepted !== true) {
      throw new Error(`ITF Flow rejected the event with HTTP ${response.status}.`);
    }
    await prisma.integrationOutboxEvent.updateMany({
      where: { id: event.id, leaseId: event.leaseId, status: IntegrationOutboxStatus.PROCESSING },
      data: {
        status: IntegrationOutboxStatus.DELIVERED,
        attemptCount,
        deliveredAt: new Date(),
        leaseId: null,
        leaseExpiresAt: null,
        lastError: null,
      },
    });
    return true;
  } catch (error) {
    const deadLetter = attemptCount >= configuration.maxAttempts;
    const delay = retryDelaySeconds(
      attemptCount,
      configuration.retryBaseSeconds,
      configuration.retryMaxSeconds
    );
    await prisma.integrationOutboxEvent.updateMany({
      where: { id: event.id, leaseId: event.leaseId, status: IntegrationOutboxStatus.PROCESSING },
      data: {
        status: deadLetter ? IntegrationOutboxStatus.DEAD_LETTER : IntegrationOutboxStatus.RETRY,
        attemptCount,
        availableAt: new Date(Date.now() + delay * 1000),
        leaseId: null,
        leaseExpiresAt: null,
        lastError: error instanceof Error ? error.message.slice(0, 500) : "Delivery failed.",
      },
    });
    return false;
  }
}

export async function deliverItfFlowSessionEvents(eventIds?: readonly string[]) {
  if (eventIds && eventIds.length === 0) {
    return { configured: true, claimed: 0, delivered: 0, failed: 0 };
  }
  try {
    const events = await claimEvents(eventIds);
    const results = await Promise.all(events.map(deliverClaimedEvent));
    return {
      configured: true,
      claimed: events.length,
      delivered: results.filter(Boolean).length,
      failed: results.filter((result) => !result).length,
    };
  } catch (error) {
    if (error instanceof WorkspaceConfigurationError) {
      return { configured: false, claimed: 0, delivered: 0, failed: 0 };
    }
    throw error;
  }
}
