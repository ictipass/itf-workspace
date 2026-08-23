# W04 — Immediate central revocation delivery to ITF Flow

Workspace implementation commits: `c8d3605`, fail-closed contract hardening `6427f98`

ITF Flow receiver commits: `30ace13`, fail-closed contract hardening `7a3a849`, documentation `0018690`

## Business outcome

Signing out of Workspace, terminating a Workspace session, changing a password, deactivating an account, reaching an
idle/absolute timeout, or using session-limit recovery now produces an immediate session-specific logout instruction
for ITF Flow. Revoking ITF Flow access or deactivating the ITF Flow registry entry produces an entitlement instruction
that terminates all matching Flow sessions and disables that Flow identity.

The security state change does not depend on a browser tab, iframe, hidden Workspace window or child-app cooperation.

## Transaction and delivery design

- The Workspace database update and `IntegrationOutboxEvent` insert occur in the same PostgreSQL transaction. A crash
  cannot commit revocation without recording the required delivery work.
- Each event has a UUID idempotency key, versioned payload, target app slug, Workspace user/session identifiers,
  bounded reason, lease, attempt count, next-attempt time and final delivery/dead-letter state.
- The initiating request makes a bounded immediate attempt. Receiver failure never restores Workspace access; the
  durable row moves to exponential retry.
- `POST /api/internal/integration-outbox`, protected by a separate worker credential, processes due retries. Lease-based
  claiming is safe with multiple Workspace instances. An expired lease may cause a duplicate delivery, which ITF Flow
  accepts idempotently.
- Retry defaults are 30 seconds with exponential growth capped at one hour, ten attempts, a 20-event batch, a
  three-second HTTP timeout and a 30-second lease. All are bounded environment configuration.
- ITF Flow atomically inserts the unique event and revokes its sessions. Concurrent duplicate requests cannot apply a
  second state transition. Unknown users are still recorded as accepted events.

W04 deliberately implements the first Flow-specific durable path. W17/W18 will generalize connector discovery,
per-application routing, reconciliation and operator tooling before repeatable onboarding of further child apps.

## Revocation coverage

| Workspace event | ITF Flow effect |
|---|---|
| Explicit sign-out or terminate one session | Revoke Flow sessions with the same `workspaceSessionId` |
| Terminate all, password change, timeout or session-limit recovery | Emit one exact event per affected Workspace session |
| Account deactivation | Revoke exact sessions and also send entitlement revocation as a fail-safe |
| ITF Flow access revocation | Revoke every active Flow session and deactivate the Flow identity |
| ITF Flow registry deactivation, including status changed through edit | Revoke entitlement for every active access record |

Regranting an entitlement requires the existing directory synchronization to reconcile/reactivate the ITF Flow user
before launch.

## Configuration

| Variable | Purpose/default |
|---|---|
| `ITF_FLOW_SESSION_EVENTS_URL` | Explicit receiver URL; otherwise derived from `ITF_FLOW_URL` |
| `ITF_FLOW_APP_SLUG` | Receiver target, default `itf-flow` |
| `WORKSPACE_INTEROP_SECRET` | Separate Workspace-to-Flow bearer credential; at least 32 characters in production |
| `WORKSPACE_OUTBOX_WORKER_SECRET` | Separate credential protecting the retry endpoint; required in production |
| `WORKSPACE_OUTBOX_REQUEST_TIMEOUT_MS` | Outbound timeout, default `3000`, bounded `500..15000` |
| `WORKSPACE_OUTBOX_BATCH_SIZE` | Claim size, default `20`, bounded `1..100` |
| `WORKSPACE_OUTBOX_MAX_ATTEMPTS` | Delivery limit, default `10`, bounded `1..50` |
| `WORKSPACE_OUTBOX_RETRY_BASE_SECONDS` | Initial retry delay, default `30` |
| `WORKSPACE_OUTBOX_RETRY_MAX_SECONDS` | Retry cap, default `3600` |
| `WORKSPACE_OUTBOX_LEASE_SECONDS` | Competing-worker lease, default `30` |

Production endpoints must use HTTPS. Development, staging and production credentials must be different and stored in
their deployment secret managers. The worker endpoint should be invoked by the approved scheduler at an interval no
longer than the configured base retry interval. No credential or payload is logged in `lastError`.

The current Workspace local `.env` has `ITF_FLOW_URL` but not the matching interop/worker credentials. Therefore local
requests durably queue events but do not call ITF Flow until those values are configured. No secret was copied or
invented during W04.

## Database and deployment

Migration `20260823200000_add_integration_outbox` creates the two outbox enums, table, unique event key and claim/audit
indexes. It was applied to local `itf_workspace_db`; all eight migrations report up to date.

Deploy Workspace before or together with the hardened Flow receiver. Configure the Flow receiver and shared
environment-specific interop secret first, then configure the Workspace sender and scheduler. Rollback must stop the
worker before reverting application code; retained outbox rows must not be dropped until reconciliation is complete.

## Verification evidence

- Workspace: 37/37 security tests pass; TypeScript, Prisma validation/status, ESLint and production build pass.
- ITF Flow: 11/11 security tests pass; TypeScript, ESLint and production build pass.
- Both repositories carry the same `itf-workspace-session-event-v1` fixture. Central logout requires an exact session
  identifier, while entitlement revocation prohibits one and always applies to all active sessions for the identity.
- The local database migration applied successfully and reports up to date.

End-to-end outage/retry and duplicate-delivery testing remains a staging acceptance activity because the Workspace
local environment is intentionally missing the service credentials.

## User interface effect

No visible UI changed. Existing sign-out, session termination, user/app administration and access-revocation controls
now propagate their security effect to ITF Flow in the background.

## Readiness and next action

W04 is Implemented. Subsequent A01 commits `1a08a5b` (Workspace) and `02b433d` (Flow) completed the cross-repository
code reassessment. Gate A is not yet formally satisfied because environment-separated staging configuration and the
joint lifecycle/outage/duplicate-delivery exercise have not been supplied. Production signing also still requires the
approved KMS/HSM adapter.

The next action is the joint A01 staging acceptance exercise after Infrastructure supplies separate staging launch,
directory, interoperability and worker configuration plus an approved scheduler. Without that external
configuration, the next policy preparation is W05 through decisions D08-D11.
