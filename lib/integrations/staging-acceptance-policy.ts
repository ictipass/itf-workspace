import { z } from "zod";

type Environment = Readonly<Record<string, string | undefined>>;
function utcExpiry(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ? Date.parse(value) : NaN;
}
export function stagingAcceptanceConfigurationIssues(environment: Environment = process.env) {
  const issues: string[] = [];
  const enabled = environment.WORKSPACE_STAGING_ACCEPTANCE_ENABLED;
  if (enabled && enabled !== "true" && enabled !== "false") issues.push("WORKSPACE_STAGING_ACCEPTANCE_ENABLED must be true or false.");
  if (enabled === "true") {
    if (environment.WORKSPACE_DEPLOYMENT_STAGE !== "staging" || environment.VERCEL_ENV === "production") issues.push("Staging acceptance requires Workspace staging, never Vercel Production.");
    if (!environment.WORKSPACE_STAGING_ACCEPTANCE_USER_ID?.trim() || environment.WORKSPACE_STAGING_ACCEPTANCE_USER_ID.trim().length > 200) issues.push("Staging acceptance requires one bounded Workspace test-user ID.");
    if (!Number.isFinite(utcExpiry(environment.WORKSPACE_STAGING_ACCEPTANCE_EXPIRES_AT))) issues.push("Staging acceptance requires a valid UTC expiry timestamp.");
    if (utcExpiry(environment.WORKSPACE_STAGING_ACCEPTANCE_EXPIRES_AT) > Date.now() + 24 * 60 * 60_000) issues.push("Staging acceptance expiry must be within 24 hours.");
  }
  return issues;
}
export const acceptanceReason = /^STAGING_A01_(06|07):[0-9a-f-]{36}$/;
export function stagingAcceptanceTarget(environment: Environment = process.env, now = new Date()) {
  const userId = environment.WORKSPACE_STAGING_ACCEPTANCE_USER_ID?.trim();
  const expiry = utcExpiry(environment.WORKSPACE_STAGING_ACCEPTANCE_EXPIRES_AT);
  if (environment.WORKSPACE_DEPLOYMENT_STAGE !== "staging" || environment.VERCEL_ENV === "production" ||
      environment.WORKSPACE_STAGING_ACCEPTANCE_ENABLED !== "true" || !userId || userId.length > 200 ||
      !Number.isFinite(expiry) || expiry <= now.getTime() || expiry > now.getTime() + 24 * 60 * 60_000) return null;
  return userId;
}
export const startAcceptanceSchema = z.object({
  caseId: z.enum(["A01-06", "A01-07"]),
  approvalReference: z.string().trim().min(1).max(300),
  confirmation: z.literal("REVOKE_TEST_ACCESS"),
});
export const acceptanceObservationSchema = z.object({
  version: z.literal("itf-workspace-staging-acceptance-v1"),
  eventId: z.uuid().nullable(),
  provisioned: z.boolean(),
  isActive: z.boolean(),
  activeSessions: z.number().int().nonnegative(),
  unrevokedSessions: z.number().int().nonnegative(),
  eventCount: z.number().int().min(0).max(1),
  revokedSessions: z.number().int().nonnegative(),
}).strict();
export const acceptanceAckSchema = z.object({
  accepted: z.literal(true), duplicate: z.boolean(), matchedSessions: z.number().int().nonnegative(),
});
export function shouldFailStagingDelivery(event: { workspaceUserId: string; reason: string }, environment: Environment = process.env) {
  return event.workspaceUserId === stagingAcceptanceTarget(environment) &&
    /^STAGING_A01_07:[0-9a-f-]{36}$/.test(event.reason);
}
