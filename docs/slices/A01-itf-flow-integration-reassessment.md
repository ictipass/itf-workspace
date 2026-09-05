# A01 - ITF Flow integration reassessment

Status: **In progress - code complete; Workspace prerequisite accepted; joint staging acceptance pending**

Implementation date: 2026-08-23

Workspace implementation commit: `1a08a5b`

ITF Flow implementation commit: `02b433d`; Flow documentation: `49e4d95`; staging configuration hygiene: `f48b702`;
pooled runtime/direct migration database hardening: `d0199ce`

## Outcome

Workspace and ITF Flow have been reassessed as one security lifecycle. The code now coordinates launch,
provisioning, role/assurance changes and revocation instead of allowing those paths to temporarily disagree. It is
ready for joint staging configuration and acceptance testing, but this is not controlled-pilot or production approval.

## Implemented changes

- Launch assertions carry the authoritative Workspace idle and three-hour absolute session deadlines. Flow caps its
  database session and browser cookie at the earlier deadline and rejects missing, expired or inverted bounds.
- Directory synchronization uses version `itf-workspace-directory-v1`, a UUID request ID, explicit target app and
  batch position. Batch size and the 30-second request timeout are bounded environment configuration.
- Flow binds each directory request ID to a digest of the validated payload. Identical retries return the recorded
  result; reuse for different content is rejected.
- Immutable Workspace user ID is authoritative. Email can only link an existing Flow identity that has no Workspace
  ID. Split or conflicting ID/email matches fail the batch instead of merging accounts.
- Flow revokes active sessions transactionally when a synchronized role changes or an active identity is deactivated.
- Changing an active Flow entitlement role first queues entitlement revocation. Workspace will not send the
  reactivating directory update until relevant revocations are delivered.
- Raising the Flow application or one of its roles from standard to sensitive queues central logout for affected
  sessions. Users must satisfy the stronger TOTP requirement on their next launch.
- Flow launch resolves the immutable identity in the same transaction that consumes the one-time assertion. Unknown,
  inactive, conflicting or role-mismatched identities fail closed.
- Flow accepts both provider-supported `postgres://` and `postgresql://` URLs, uses pooled `DATABASE_URL` for runtime
  traffic, and selects `DIRECT_URL` for migrations and administrative tooling when configured.

No database migration was needed in either repository.

## Operational sequence

This is a coordinated, fail-closed contract revision. Flow must be deployed before or together with Workspace because
old launch assertions without upstream session deadlines are rejected. Configure each environment independently,
synchronize the directory, then exercise launch and revocation before enabling users.

Staging needs distinct values for:

- Workspace: `WORKSPACE_DEPLOYMENT_STAGE=staging`, scoped to the Vercel Preview `staging` branch.
- Workspace: `WORKSPACE_DIRECTORY_SYNC_SECRET`, `WORKSPACE_INTEROP_SECRET`,
  `WORKSPACE_OUTBOX_WORKER_SECRET`, its launch issuer/signing configuration, and the approved worker scheduler.
- Flow: matching directory/interoperability credentials plus `WORKSPACE_LAUNCH_ISSUER`,
  `WORKSPACE_LAUNCH_AUDIENCE` and `WORKSPACE_LAUNCH_JWKS_URL`.
- If Workspace is reached through a reverse proxy whose forwarded host differs from the browser origin, Workspace:
  `WORKSPACE_SERVER_ACTION_ALLOWED_ORIGINS` containing only the specifically approved browser `host[:port]` values.

Do not copy production credentials into development/staging or reuse one credential for directory and session-event
APIs. Production launch signing remains blocked until the approved KMS/HSM adapter is available.

The local development-tunnel allowance in `a6a90ab` is not staging acceptance evidence and does not approve a wildcard
proxy domain. Changing the tunnel hostname requires an explicit configuration update and a Workspace restart.
The branch-scoped Vercel staging configuration is governed by
[`Vercel deployment environments`](../vercel-deployment-environments.md).

## Approved staging profile

Recorded 2026-09-04:

- ITF Flow staging origin: `https://itf-flow-staging.vercel.app`;
- the Flow staging database exists and its migrations are applied;
- Flow application assurance: `STANDARD`; and
- initial Flow `SYSTEM_ADMIN` role assurance: `SENSITIVE`.

The more restrictive classification wins. Ordinary standard Flow roles may therefore use password-only launch, while
the Flow `SYSTEM_ADMIN` role requires a fresh TOTP step-up even though the application itself is standard.

Configure Workspace's staging branch with the following non-secret values:

```dotenv
ITF_FLOW_URL="https://itf-flow-staging.vercel.app/workspace/launch"
ITF_FLOW_DIRECTORY_SYNC_URL="https://itf-flow-staging.vercel.app/api/integrations/workspace/directory-sync"
ITF_FLOW_SESSION_EVENTS_URL="https://itf-flow-staging.vercel.app/api/integrations/workspace/session-events"
ITF_FLOW_APP_SLUG="itf-flow"
WORKSPACE_OUTBOX_RETRY_BASE_SECONDS="30"
```

The staging-only `WORKSPACE_DIRECTORY_SYNC_SECRET` and `WORKSPACE_INTEROP_SECRET` must match their respective Flow
values. `WORKSPACE_OUTBOX_WORKER_SECRET` is a third independent credential protecting only Workspace's retry endpoint.

Vercel Hobby cron cannot meet this integration's retry requirement. It runs at most once daily with hourly
imprecision, and Vercel invokes cron routes only on Production deployments rather than the staging Preview deployment.
Changing `WORKSPACE_OUTBOX_RETRY_BASE_SECONDS` to one day would delay recovery rather than solve scheduling. Retain the
30-second base and use a scheduler that invokes the worker at least every 30 seconds. An authorized manual invocation
is permitted solely for the finite A01 outage/retry acceptance scenario; it does not satisfy the continuous
controlled-pilot gate.

## Verification evidence

- Workspace: TypeScript and ESLint pass; production build passes; 44/44 security and contract tests pass.
- ITF Flow: TypeScript and ESLint pass; production build passes; 24/24 security, database-configuration and contract
  tests pass.
- Local databases: Workspace's 8 migrations and Flow's 28 migrations are applied and current.
- Workspace environment validation passes development rules and reports Flow directory synchronization configured.
- Flow reaches PostgreSQL but correctly fails environment readiness because launch issuer, audience and JWKS URL are
  absent.

Workspace-only staging authentication was accepted on 2026-09-04, including public JWKS access, controlled
administrator bootstrap, password replacement and QR/TOTP enrollment. This is a prerequisite, not joint integration
evidence.

The required joint staging exercise must prove provisioning, successful launch, replay rejection, role mismatch/change,
assurance increase, central logout, entitlement revocation, duplicate delivery and outage/retry recovery.

## User interface effect

No layout changed. After an administrator grants or changes ITF Flow access, the success message now explicitly says
to synchronize the Flow directory before the user launches the changed role. Affected users may be signed out of Flow
after a role, status or assurance increase and must relaunch through Workspace.

## Readiness and next action

A01's code implementation is complete, but the slice remains In progress until environment-separated staging
credentials, scheduler and joint acceptance evidence exist. Gate A is therefore not formally met, and Workspace is
not yet approved for an ITF Flow pilot.

Next best implementable action: configure and execute the A01 joint staging acceptance exercise. If Infrastructure
cannot yet provide that environment, resolve D08-D11 so W05 login abuse protection can begin.
