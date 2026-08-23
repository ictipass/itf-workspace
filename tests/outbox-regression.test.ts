import assert from "node:assert/strict";
import test from "node:test";
import {
  buildItfFlowSessionEventPayload,
  retryDelaySeconds,
  shouldQueueEntitlementRoleChange,
} from "../lib/integrations/outbox-policy";

test("builds the versioned, audience-addressed ITF Flow revocation contract", () => {
  assert.deepEqual(
    buildItfFlowSessionEventPayload({
      eventId: "f1a83545-6687-4aec-8644-c38d4e7f2722",
      type: "CENTRAL_LOGOUT",
      workspaceUserId: "workspace-user-1",
      workspaceSessionId: "workspace-session-1",
      targetAppSlug: "itf-flow",
      occurredAt: new Date("2026-08-23T12:00:00.000Z"),
      reason: "USER_SIGN_OUT",
    }),
    {
      version: "itf-workspace-session-event-v1",
      eventId: "f1a83545-6687-4aec-8644-c38d4e7f2722",
      type: "CENTRAL_LOGOUT",
      workspaceUserId: "workspace-user-1",
      workspaceSessionId: "workspace-session-1",
      targetAppSlug: "itf-flow",
      occurredAt: "2026-08-23T12:00:00.000Z",
      reason: "USER_SIGN_OUT",
    }
  );
});

test("integration retry delay grows exponentially and remains bounded", () => {
  assert.equal(retryDelaySeconds(1, 30, 3600), 30);
  assert.equal(retryDelaySeconds(2, 30, 3600), 60);
  assert.equal(retryDelaySeconds(8, 30, 3600), 3600);
  assert.equal(retryDelaySeconds(20, 30, 3600), 3600);
});

test("queues old-role revocation only for an active role change", () => {
  assert.equal(shouldQueueEntitlementRoleChange({ status: "ACTIVE", appRole: "OFFICER" }, "DIRECTOR"), true);
  assert.equal(shouldQueueEntitlementRoleChange({ status: "ACTIVE", appRole: "OFFICER" }, "OFFICER"), false);
  assert.equal(shouldQueueEntitlementRoleChange({ status: "REVOKED", appRole: "OFFICER" }, "DIRECTOR"), false);
});
