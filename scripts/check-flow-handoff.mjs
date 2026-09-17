import { readFile } from "node:fs/promises";
import { createPrivateKey, createPublicKey } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

// Explicit local env-file preflight, not an assertion about Vercel's deployed configuration.
const workspace = dotenv.parse(await readFile(".env", "utf8"));
const flowPath = process.argv.find((arg) => arg.startsWith("--flow-env="))?.slice(11);
if (!flowPath) throw new Error("Supply --flow-env=../itf-flow/.env. Environment contents are never printed.");
const flow = dotenv.parse(await readFile(flowPath, "utf8"));
const report = { source: "local env files; verify matching Vercel variables separately" };
const failures = [];
try {
  const issuer = new URL(workspace.WORKSPACE_LAUNCH_ISSUER).toString();
  const flowIssuer = new URL(flow.WORKSPACE_LAUNCH_ISSUER).toString();
  const jwksUrl = new URL(flow.WORKSPACE_LAUNCH_JWKS_URL ?? "/api/integrations/workspace/v2/jwks", flowIssuer);
  if (jwksUrl.username || jwksUrl.password || !["http:", "https:"].includes(jwksUrl.protocol)) throw new Error("invalid URL");
  report.issuerMatches = issuer === flowIssuer;
  report.jwksOriginMatches = jwksUrl.origin === new URL(issuer).origin;
  const response = await fetch(jwksUrl, { redirect: "error", signal: AbortSignal.timeout(10000) });
  report.jwksHttpStatus = response.status;
  const jwks = await response.json();
  const key = jwks.keys?.find((item) => item.kid === workspace.WORKSPACE_LAUNCH_ACTIVE_KID);
  report.signingKeyIdPublished = Boolean(key);
  if (workspace.WORKSPACE_LAUNCH_SIGNER_PROVIDER === "software") {
    const privateKey = createPrivateKey(Buffer.from(workspace.WORKSPACE_LAUNCH_PRIVATE_KEY_PEM_BASE64 ?? "", "base64"));
    const local = createPublicKey(privateKey).export({ format: "jwk" });
    report.localSigningPublicKeyMatchesDeployed = Boolean(key && local.n === key.n && local.e === key.e);
  }
} catch {
  failures.push("SIGNING_PREFLIGHT_UNAVAILABLE: check issuer/JWKS reachability and software key configuration.");
}

async function query(env, sql) {
  const client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10000, query_timeout: 10000 });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const result = await client.query(sql);
    await client.query("COMMIT");
    return result.rows;
  } finally { await client.end(); }
}
try {
  const [accesses, identities] = await Promise.all([
    query(workspace, `SELECT a."userId", a."appRole", u.email, p."launchAudience", p.slug
      FROM "AppAccess" a JOIN "User" u ON u.id = a."userId" JOIN "App" p ON p.id = a."appId"
      WHERE p.slug = 'itf-flow' AND a.status = 'ACTIVE' AND u.status = 'ACTIVE' AND p.status = 'ACTIVE'`),
    query(flow, `SELECT "workspaceUserId", email, role, "isActive" FROM "User" WHERE "workspaceUserId" IS NOT NULL`),
  ]);
  const byId = new Map(identities.map((user) => [user.workspaceUserId, user]));
  report.activeFlowEntitlements = accesses.length;
  report.missingProvisioning = accesses.filter((access) => !byId.has(access.userId)).length;
  report.inactiveProvisioning = accesses.filter((access) => byId.get(access.userId)?.isActive === false).length;
  report.roleMismatches = accesses.filter((access) => byId.has(access.userId) && byId.get(access.userId).role !== access.appRole).length;
  report.emailMismatches = accesses.filter((access) => byId.has(access.userId) && byId.get(access.userId).email !== access.email).length;
  report.audienceMismatches = accesses.filter((access) => access.launchAudience !== flow.WORKSPACE_LAUNCH_AUDIENCE).length;
  report.slugMismatches = accesses.filter((access) => access.slug !== (flow.WORKSPACE_APP_SLUG || "itf-flow")).length;
} catch {
  failures.push("DIRECTORY_PREFLIGHT_UNAVAILABLE: check both database connections and applied migrations.");
}
try {
  report.undeliveredFlowEvents = await query(workspace, `SELECT status, COUNT(*)::int AS count FROM "IntegrationOutboxEvent"
    WHERE "targetAppSlug" = 'itf-flow' AND status IN ('PENDING', 'RETRY', 'PROCESSING', 'DEAD_LETTER') GROUP BY status`);
} catch {
  failures.push("OUTBOX_PREFLIGHT_UNAVAILABLE: check Workspace database connectivity and migrations.");
}
console.log(JSON.stringify({ ...report, failures }, null, 2));
if (failures.length || Object.entries(report).some(([key, value]) =>
  (key.endsWith("Matches") || key === "signingKeyIdPublished" || key === "localSigningPublicKeyMatchesDeployed") && value === false ||
  ["missingProvisioning", "inactiveProvisioning", "roleMismatches", "emailMismatches", "audienceMismatches", "slugMismatches"].includes(key) && value > 0
)) process.exitCode = 1;
