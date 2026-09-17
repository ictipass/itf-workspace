import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { acceptanceAckSchema, acceptanceObservationSchema, shouldFailStagingDelivery, stagingAcceptanceTarget, stagingAcceptanceConfigurationIssues, startAcceptanceSchema } from "../lib/integrations/staging-acceptance-policy";

const now = new Date("2026-09-17T12:00:00Z");
const env = { WORKSPACE_DEPLOYMENT_STAGE: "staging", VERCEL_ENV: "preview", WORKSPACE_STAGING_ACCEPTANCE_ENABLED: "true",
  WORKSPACE_STAGING_ACCEPTANCE_USER_ID: "test-staff-id", WORKSPACE_STAGING_ACCEPTANCE_EXPIRES_AT: "2026-09-17T13:00:00Z" };
test("acceptance is disabled by default, production, invalid pins and expiry", () => {
  assert.equal(stagingAcceptanceTarget(env, now), "test-staff-id");
  for (const candidate of [ {}, { ...env, WORKSPACE_DEPLOYMENT_STAGE: "production" }, { ...env, VERCEL_ENV: "production" },
    { ...env, WORKSPACE_STAGING_ACCEPTANCE_ENABLED: "false" }, { ...env, WORKSPACE_STAGING_ACCEPTANCE_USER_ID: "" },
    { ...env, WORKSPACE_STAGING_ACCEPTANCE_EXPIRES_AT: now.toISOString() },
    { ...env, WORKSPACE_STAGING_ACCEPTANCE_EXPIRES_AT: "invalid" },
    { ...env, WORKSPACE_STAGING_ACCEPTANCE_EXPIRES_AT: "2026-09-17T13:00:00+00:00" },
    { ...env, WORKSPACE_STAGING_ACCEPTANCE_EXPIRES_AT: "2026-09-19T13:00:00Z" },
  ]) assert.equal(stagingAcceptanceTarget(candidate, now), null);
  assert.ok(stagingAcceptanceConfigurationIssues({ ...env, WORKSPACE_DEPLOYMENT_STAGE: "production" }).length);
});
test("case creation requires explicit consent, approved reference and a known case", () => {
  const input = { caseId: "A01-06", approvalReference: "test maintenance reference", confirmation: "REVOKE_TEST_ACCESS" };
  assert.equal(startAcceptanceSchema.safeParse(input).success, true);
  for (const altered of [{ ...input, confirmation: "on" }, { ...input, approvalReference: " " }, { ...input, caseId: "other" }]) {
    assert.equal(startAcceptanceSchema.safeParse(altered).success, false);
  }
});
test("failure injection is limited to the pinned outage event, never normal delivery", () => {
  const current = { ...env, WORKSPACE_STAGING_ACCEPTANCE_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString() };
  const event = { workspaceUserId: "test-staff-id", reason: "STAGING_A01_07:f1a83545-6687-4aec-8644-c38d4e7f2722" };
  assert.equal(shouldFailStagingDelivery(event, current), true);
  assert.equal(shouldFailStagingDelivery({ ...event, workspaceUserId: "other-staff" }, current), false);
  assert.equal(shouldFailStagingDelivery({ ...event, reason: "ACCESS_REVOKED" }, current), false);
  assert.equal(shouldFailStagingDelivery(event, { ...current, WORKSPACE_DEPLOYMENT_STAGE: "production" }), false);
});
test("receiver observations and acknowledgements reject unsafe/unbounded responses", () => {
  const observation = { version: "itf-workspace-staging-acceptance-v1", eventId: null, provisioned: true, isActive: true, activeSessions: 2, unrevokedSessions: 3, eventCount: 0, revokedSessions: 0 };
  assert.equal(acceptanceObservationSchema.safeParse(observation).success, true);
  assert.equal(acceptanceObservationSchema.safeParse({ ...observation, email: "private@example.test" }).success, false);
  assert.equal(acceptanceObservationSchema.safeParse({ ...observation, eventCount: 2 }).success, false);
  assert.equal(acceptanceAckSchema.safeParse({ accepted: true, duplicate: true, matchedSessions: 0 }).success, true);
  assert.equal(acceptanceAckSchema.safeParse({ accepted: true }).success, false);
});
test("service authorization, filtered worker and durable recovery are enforced", async () => {
  const [service, delivery, action] = await Promise.all([
    readFile(new URL("../lib/integrations/staging-acceptance.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/integrations/itf-flow-session-events.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/admin/integrations/acceptance/actions.ts", import.meta.url), "utf8"),
  ]);
  assert.match(service, /await requireFreshMfaContext\(\)/);
  assert.match(service, /workspaceRole !== "SYSTEM_ADMIN"/);
  assert.match(service, /workspaceRole !== "STAFF"/);
  assert.match(service, /app\.environment !== "STAGING"/);
  assert.match(service, /await tx\.integrationOutboxEvent\.create/);
  assert.match(service, /baselineActiveSessions: baseline\.activeSessions/);
  assert.match(service, /retry\.lastError !== "ITF Flow rejected the event with HTTP 503\."/);
  assert.match(service, /result\.passed = result\.passed && Boolean\(faultAudit\)/);
  assert.match(service, /status !== "REVOKED"/);
  assert.match(delivery, /claimEvents\(\[eventId\]\)/);
  assert.match(delivery, /event\.attemptCount !== 0/);
  assert.match(action, /RETRY_TEST_EVENT/);
  assert.doesNotMatch(action, /form\.get\("(?:url|endpoint|userId|secret|payload)"\)/);
});
