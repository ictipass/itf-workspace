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
import { acceptanceAckSchema, shouldFailStagingDelivery, stagingAcceptanceTarget } from "@/lib/integrations/staging-acceptance-policy";

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

export function buildOutboxEventPayload(event: Omit<ClaimedEvent, "id" | "attemptCount" | "leaseId">) {
  if (event.type === IntegrationOutboxEventType.CENTRAL_LOGOUT) {
    if (!event.workspaceSessionId) throw new Error("Central logout session identifier missing.");
    return buildItfFlowSessionEventPayload({ ...event, type: "CENTRAL_LOGOUT", workspaceSessionId: event.workspaceSessionId, occurredAt: event.createdAt });
  }
  return buildItfFlowSessionEventPayload({ ...event, type: "ENTITLEMENT_REVOKED", workspaceSessionId: undefined, occurredAt: event.createdAt });
}

async function deliverClaimedEvent(event: ClaimedEvent, diagnostic?: {
  failReceiver: boolean;
  acknowledgement?: (value: { accepted: true; duplicate: boolean; matchedSessions: number }) => void;
}) {
  const configuration = resolveItfFlowSessionEventConfiguration();
  const attemptCount = event.attemptCount + 1;
  try {
    if (event.type === IntegrationOutboxEventType.CENTRAL_LOGOUT && !event.workspaceSessionId) {
      throw new Error("A central logout event is missing its Workspace session identifier.");
    }
    const payload = buildOutboxEventPayload(event);
    const response = await fetch(configuration.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.secret}`,
        "Content-Type": "application/json",
        "X-Correlation-Id": event.eventId,
        ...(diagnostic?.failReceiver && shouldFailStagingDelivery(event)
          ? { "X-ITF-Staging-Receiver-Failure": "once" } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(configuration.requestTimeoutMs),
    });
    const result = (await response.json().catch(() => null)) as { accepted?: boolean } | null;
    if (!response.ok || result?.accepted !== true) {
      throw new Error(`ITF Flow rejected the event with HTTP ${response.status}.`);
    }
    if (diagnostic?.acknowledgement) {
      diagnostic.acknowledgement(acceptanceAckSchema.parse(result));
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

// Narrow staging-only worker invocation. Cannot process an unlinked or unrelated event.
export async function deliverStagingAcceptanceEvent(eventId: string, failReceiver = false) {
  const target = stagingAcceptanceTarget();
  if (!target) throw new Error("Staging diagnostic is disabled or expired.");
  const event = await prisma.integrationOutboxEvent.findUnique({ where: { eventId } });
  if (!event || event.workspaceUserId !== target || event.type !== "ENTITLEMENT_REVOKED" ||
      !/^STAGING_A01_(06|07):[0-9a-f-]{36}$/.test(event.reason) ||
      !isItfFlowAppSlug(event.targetAppSlug) || (failReceiver && (event.attemptCount !== 0 || !shouldFailStagingDelivery(event)))) {
    throw new Error("Invalid staging diagnostic event.");
  }
  const claimed = await claimEvents([eventId]);
  let acknowledgement: { accepted: true; duplicate: boolean; matchedSessions: number } | undefined;
  const delivered = claimed.length === 1
    ? await deliverClaimedEvent(claimed[0], { failReceiver, acknowledgement: (value) => { acknowledgement = value; } })
    : false;
  return { claimed: claimed.length, delivered, acknowledgement };
}

export async function deliverItfFlowSessionEvents(eventIds?: readonly string[]) {
  if (eventIds && eventIds.length === 0) {
    return { configured: true, claimed: 0, delivered: 0, failed: 0 };
  }
  try {
    const events = await claimEvents(eventIds);
    const results = await Promise.all(events.map((event) => deliverClaimedEvent(event)));
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
