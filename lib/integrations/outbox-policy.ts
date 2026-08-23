export const ITF_FLOW_SESSION_EVENT_VERSION = "itf-workspace-session-event-v1" as const;

type ItfFlowSessionEventPayloadCommon = {
  eventId: string;
  workspaceUserId: string;
  targetAppSlug: string;
  occurredAt: Date;
  reason: string;
};

export type ItfFlowSessionEventPayloadInput = ItfFlowSessionEventPayloadCommon &
  (
    | { type: "CENTRAL_LOGOUT"; workspaceSessionId: string }
    | { type: "ENTITLEMENT_REVOKED"; workspaceSessionId?: never }
  );

export function buildItfFlowSessionEventPayload(input: ItfFlowSessionEventPayloadInput) {
  return {
    version: ITF_FLOW_SESSION_EVENT_VERSION,
    eventId: input.eventId,
    type: input.type,
    workspaceUserId: input.workspaceUserId,
    ...(input.type === "CENTRAL_LOGOUT"
      ? { workspaceSessionId: input.workspaceSessionId }
      : {}),
    targetAppSlug: input.targetAppSlug,
    occurredAt: input.occurredAt.toISOString(),
    reason: input.reason,
  };
}

export function retryDelaySeconds(
  attempt: number,
  baseSeconds: number,
  maxSeconds: number
) {
  return Math.min(maxSeconds, baseSeconds * 2 ** Math.max(0, attempt - 1));
}

export function shouldQueueEntitlementRoleChange(
  previous: { status: string; appRole: string } | null,
  nextRole: string
) {
  return previous?.status === "ACTIVE" && previous.appRole !== nextRole;
}
