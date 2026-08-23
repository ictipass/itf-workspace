export const ITF_FLOW_SESSION_EVENT_VERSION = "itf-workspace-session-event-v1" as const;

export type ItfFlowSessionEventPayloadInput = {
  eventId: string;
  type: "CENTRAL_LOGOUT" | "ENTITLEMENT_REVOKED";
  workspaceUserId: string;
  workspaceSessionId?: string;
  targetAppSlug: string;
  occurredAt: Date;
  reason: string;
};

export function buildItfFlowSessionEventPayload(input: ItfFlowSessionEventPayloadInput) {
  return {
    version: ITF_FLOW_SESSION_EVENT_VERSION,
    eventId: input.eventId,
    type: input.type,
    workspaceUserId: input.workspaceUserId,
    workspaceSessionId: input.workspaceSessionId,
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
