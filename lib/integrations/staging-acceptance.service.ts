import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireFreshMfaContext } from "@/lib/auth/current-user";
import { resolveItfFlowSessionEventConfiguration } from "@/lib/config/workspace-environment";
import { buildOutboxEventPayload, deliverStagingAcceptanceEvent } from "@/lib/integrations/itf-flow-session-events";
import { acceptanceAckSchema, acceptanceObservationSchema, stagingAcceptanceTarget, startAcceptanceSchema } from "./staging-acceptance-policy";

export class AcceptanceError extends Error {}
export type AcceptanceEvidence = {
  caseId: string; eventId: string; status: string; attempts: number; nextAttemptAt: string;
  entitlementRevoked: boolean; activeFlowSessions: number; flowEventCount: number; revokedFlowSessions: number;
  firstDuplicate?: boolean; secondDuplicate?: boolean; initialReceiverStatus?: number; passed: boolean;
};
async function operator() {
  const context = await requireFreshMfaContext();
  if (context.user.workspaceRole !== "SYSTEM_ADMIN") throw new AcceptanceError("System Administrator required.");
  const target = stagingAcceptanceTarget();
  if (!target || target === context.user.id) throw new AcceptanceError("Staging diagnostic disabled, expired or incorrectly pinned.");
  return { actor: context.user, target };
}
async function observe(target: string, eventId?: string) {
  const config = resolveItfFlowSessionEventConfiguration();
  const endpoint = new URL("/api/integrations/workspace/staging-acceptance", config.endpoint);
  const response = await fetch(endpoint, {
    method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(config.requestTimeoutMs),
    headers: { Authorization: `Bearer ${config.secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceUserId: target, ...(eventId ? { eventId } : {}) }),
  });
  if (!response.ok) throw new AcceptanceError("Flow staging observation unavailable. Check both temporary flags, target, expiry and receiver configuration.");
  const result = acceptanceObservationSchema.safeParse(await response.json().catch(() => null));
  if (!result.success || result.data.eventId !== (eventId ?? null)) throw new AcceptanceError("Invalid Flow observation response.");
  return result.data;
}
function dueUnrelated(appSlug: string, eventId?: string) {
  return prisma.integrationOutboxEvent.count({ where: {
    targetAppSlug: appSlug, ...(eventId ? { eventId: { not: eventId } } : {}),
    OR: [{ status: { in: ["PENDING", "RETRY"] }, availableAt: { lte: new Date() } }, { status: "PROCESSING" }],
  } });
}
async function evidence(eventId: string, caseId: string, target: string, baseline: number,
  firstDuplicate?: boolean, secondDuplicate?: boolean): Promise<AcceptanceEvidence> {
  const [event, flow] = await Promise.all([
    prisma.integrationOutboxEvent.findUniqueOrThrow({ where: { eventId } }), observe(target, eventId),
  ]);
  const app = await prisma.app.findUniqueOrThrow({ where: { slug: event.targetAppSlug } });
  const access = await prisma.appAccess.findUnique({ where: { userId_appId: { userId: target, appId: app.id } } });
  const entitlementRevoked = access?.status === "REVOKED";
  return { caseId, eventId, status: event.status, attempts: event.attemptCount, nextAttemptAt: event.availableAt.toISOString(),
    entitlementRevoked, activeFlowSessions: flow.activeSessions, flowEventCount: flow.eventCount,
    revokedFlowSessions: flow.revokedSessions, firstDuplicate, secondDuplicate,
    passed: event.status === "DELIVERED" && entitlementRevoked && !flow.isActive && flow.activeSessions === 0 &&
      flow.eventCount === 1 && flow.revokedSessions === baseline && baseline > 0 &&
      (caseId !== "A01-06" || (firstDuplicate === false && secondDuplicate === true)),
  };
}
async function record(actorId: string, result: AcceptanceEvidence) {
  await prisma.auditLog.create({ data: { actorId, action: "ACCESS_REVOKED", metadata: {
    mode: "STAGING_ACCEPTANCE_RESULT", caseId: result.caseId, eventId: result.eventId,
    status: result.status, attempts: result.attempts, passed: result.passed,
    ...(result.initialReceiverStatus !== undefined ? { initialReceiverStatus: result.initialReceiverStatus } : {}),
    ...(result.firstDuplicate !== undefined ? { firstDuplicate: result.firstDuplicate } : {}),
    ...(result.secondDuplicate !== undefined ? { secondDuplicate: result.secondDuplicate } : {}),
    activeFlowSessions: result.activeFlowSessions, flowEventCount: result.flowEventCount, revokedFlowSessions: result.revokedFlowSessions,
  } } });
}

export async function startStagingAcceptance(input: unknown) {
  const parsed = startAcceptanceSchema.safeParse(input);
  if (!parsed.success) throw new AcceptanceError("Select a case, supply the maintenance approval reference and confirm test-access revocation.");
  const { actor, target } = await operator();
  const config = resolveItfFlowSessionEventConfiguration();
  const [app, user, baseline] = await Promise.all([
    prisma.app.findUnique({ where: { slug: config.appSlug }, include: { rolePolicies: true } }),
    prisma.user.findUnique({ where: { id: target } }), observe(target),
  ]);
  if (!app || app.environment !== "STAGING" || app.status !== "ACTIVE" || app.assuranceRequirement !== "STANDARD" ||
      new URL(app.url).origin !== new URL(config.endpoint).origin ||
      !app.rolePolicies.some((role) => role.roleCode === "OFFICER" && role.isActive && role.assuranceRequirement === "STANDARD") ||
      !user || user.workspaceRole !== "STAFF" || user.status !== "ACTIVE") {
    throw new AcceptanceError("Require active ordinary test staff and staging Flow with approved OFFICER = STANDARD.");
  }
  if (!baseline.provisioned || !baseline.isActive || baseline.activeSessions < 1) throw new AcceptanceError("Launch Flow for the pinned test user before starting.");
  if (await dueUnrelated(config.appSlug)) throw new AcceptanceError("Unrelated due/processing Flow events exist. Resolve them through approved operations before testing.");
  const eventId = randomUUID();
  await prisma.$transaction(async (tx) => {
    if (stagingAcceptanceTarget() !== target) throw new AcceptanceError("Diagnostic configuration expired or changed before revocation.");
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${target} FOR UPDATE`;
    const activeUser = await tx.user.findUnique({ where: { id: target } });
    if (activeUser?.workspaceRole !== "STAFF" || activeUser.status !== "ACTIVE") throw new AcceptanceError("Test staff eligibility changed; no diagnostic mutation applied.");
    const revoked = await tx.appAccess.updateMany({ where: { userId: target, appId: app.id, status: "ACTIVE", appRole: "OFFICER" },
      data: { status: "REVOKED", revokedAt: new Date() } });
    if (revoked.count !== 1) throw new AcceptanceError("Require one active OFFICER entitlement. Restore and synchronize the dedicated user before a new case.");
    await tx.integrationOutboxEvent.create({ data: { eventId, targetAppSlug: config.appSlug, workspaceUserId: target,
      type: "ENTITLEMENT_REVOKED", reason: `STAGING_${parsed.data.caseId.replace("-", "_")}:${eventId}` } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "ACCESS_REVOKED", metadata: {
      mode: "STAGING_ACCEPTANCE_START", acceptanceEventId: eventId, caseId: parsed.data.caseId,
      approvalReference: parsed.data.approvalReference, baselineActiveSessions: baseline.activeSessions,
      baselineUnrevokedSessions: baseline.unrevokedSessions,
      userId: target, appId: app.id,
    } } });
  }, { maxWait: 10000, timeout: 15000 });
  try {
    const first = await deliverStagingAcceptanceEvent(eventId, parsed.data.caseId === "A01-07");
    if (parsed.data.caseId === "A01-07") {
      const retry = await prisma.integrationOutboxEvent.findUniqueOrThrow({ where: { eventId } });
      if (retry.status !== "RETRY" || retry.attemptCount !== 1 || retry.lastError !== "ITF Flow rejected the event with HTTP 503.") {
        throw new AcceptanceError("Initial delivery did not record the requested HTTP 503; this outage case is not accepted.");
      }
      await prisma.auditLog.create({ data: { actorId: actor.id, action: "ACCESS_REVOKED", metadata: {
        mode: "STAGING_ACCEPTANCE_FAULT", eventId, httpStatus: 503, outboxStatus: retry.status,
        attempts: retry.attemptCount, nextAttemptAt: retry.availableAt.toISOString(),
      } } });
      const result = await evidence(eventId, parsed.data.caseId, target, baseline.unrevokedSessions);
      result.initialReceiverStatus = 503;
      const flow = await observe(target, eventId);
      if (first.delivered || result.status !== "RETRY" || result.attempts !== 1 || !result.entitlementRevoked ||
          flow.eventCount !== 0 || !flow.isActive || flow.activeSessions < 1 || flow.unrevokedSessions !== baseline.unrevokedSessions) {
        throw new AcceptanceError("Outage preconditions/outcome failed. Test access is revoked; inspect this run before recovery.");
      }
      await record(actor.id, result);
      return result;
    }
    if (!first.delivered || !first.acknowledgement || first.acknowledgement.duplicate) {
      throw new AcceptanceError("First delivery did not meet acceptance. Do not start another case until this event is resolved.");
    }
    const event = await prisma.integrationOutboxEvent.findUniqueOrThrow({ where: { eventId } });
    if (!stagingAcceptanceTarget()) throw new AcceptanceError("Diagnostic expired before duplicate replay.");
    const secondResponse = await fetch(config.endpoint, {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(config.requestTimeoutMs),
      headers: { Authorization: `Bearer ${config.secret}`, "Content-Type": "application/json", "X-Correlation-Id": eventId },
      body: JSON.stringify(buildOutboxEventPayload(event)),
    });
    const second = acceptanceAckSchema.safeParse(await secondResponse.json().catch(() => null));
    if (!secondResponse.ok || !second.success) throw new AcceptanceError("Duplicate acknowledgement failed. Do not rerun without reviewing this event.");
    const result = await evidence(eventId, parsed.data.caseId, target, baseline.unrevokedSessions, first.acknowledgement.duplicate, second.data.duplicate);
    result.passed = result.passed && second.data.matchedSessions === 0 && first.acknowledgement.matchedSessions === baseline.unrevokedSessions;
    await record(actor.id, result);
    return result;
  } catch (error) {
    // Durable start audit/outbox remain resumable; never suggest that revocation rolled back.
    throw new AcceptanceError(`Test access was revoked. Event reference ${eventId}. ${error instanceof AcceptanceError ? error.message : "Delivery/observation could not be confirmed; inspect or resume the run before regranting."}`);
  }
}

export async function resumeStagingAcceptance(eventId: string) {
  const { actor, target } = await operator();
  const config = resolveItfFlowSessionEventConfiguration();
  const audit = await prisma.auditLog.findFirst({ where: { actorId: actor.id, action: "ACCESS_REVOKED",
    metadata: { path: ["acceptanceEventId"], equals: eventId } } });
  const metadata = audit?.metadata as { mode?: string; caseId?: string; baselineUnrevokedSessions?: number } | null;
  if (metadata?.mode !== "STAGING_ACCEPTANCE_START" || metadata.caseId !== "A01-07" || !metadata.baselineUnrevokedSessions) {
    throw new AcceptanceError("Only your recorded A01-07 run can be resumed here.");
  }
  const event = await prisma.integrationOutboxEvent.findUnique({ where: { eventId } });
  if (!event || event.workspaceUserId !== target || event.targetAppSlug !== config.appSlug ||
      !event.reason.startsWith("STAGING_A01_07:")) throw new AcceptanceError("Invalid pinned diagnostic run.");
  const app = await prisma.app.findUniqueOrThrow({ where: { slug: config.appSlug } });
  const access = await prisma.appAccess.findUnique({ where: { userId_appId: { userId: target, appId: app.id } } });
  if (access?.status !== "REVOKED") throw new AcceptanceError("Test access was restored too early. Do not replay an old revocation; escalate lifecycle reconciliation.");
  if (await dueUnrelated(config.appSlug, eventId)) throw new AcceptanceError("Unrelated due/processing events exist; resolve them before acceptance retry.");
  if (event.status === "RETRY" && event.availableAt <= new Date()) await deliverStagingAcceptanceEvent(eventId);
  const result = await evidence(eventId, "A01-07", target, metadata.baselineUnrevokedSessions);
  const faultAudit = await prisma.auditLog.findFirst({ where: { actorId: actor.id, action: "ACCESS_REVOKED",
    AND: [{ metadata: { path: ["mode"], equals: "STAGING_ACCEPTANCE_FAULT" } },
      { metadata: { path: ["eventId"], equals: eventId } }, { metadata: { path: ["httpStatus"], equals: 503 } }] } });
  result.initialReceiverStatus = faultAudit ? 503 : undefined;
  result.passed = result.passed && Boolean(faultAudit);
  await record(actor.id, result);
  return result;
}
