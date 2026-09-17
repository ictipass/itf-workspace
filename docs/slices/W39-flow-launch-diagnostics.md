# W39 — Flow handoff failure diagnostics

Status: **Implemented; staging diagnosis/acceptance pending**

Implementation commits: Flow `9577561`; Workspace read-only preflight `c992230` (delivered alongside W40).

## Purpose and changes

Previously Flow collapsed token verification, inactive/unprovisioned identities, role conflicts, replay, database
errors and session creation failures into `/login?error=invalid-token` without a diagnostic record. That URL was not
proof of a cryptographic failure.

Flow now retains fail-closed verification and adds a server-generated UUID reference plus an allow-listed failure
stage/code in its runtime log. The login page displays only the reference and safe retry/support instructions.
Failure redirects have `no-store` and `no-referrer` headers. No token, decoded claims, staff identity, database URL,
raw exception message or stack is included in the new diagnostic record. These are additional controls; existing
platform logs must still be handled as sensitive operational data.

Workspace adds a read-only local preflight:

```cmd
npm run integration:check-flow -- --flow-env=../itf-flow/.env
```

It reads the two local env files, GETs public JWKS, compares issuer/key/audience/slug, and uses read-only database
transactions to report aggregate provisioning differences and undelivered-event counts. It does not print env
contents, credentials or staff records. It does not prove Vercel has the same env values; check deployment scopes
separately. It does not activate users, synchronize directories, deliver events or create sessions.

## Evidence and limits

Read-only staging checks on 2026-09-17 found public JWKS HTTP 200, matching local signing public key and issuer, seven
active central Flow entitlements, zero missing identities/role/email/audience/slug differences, and one inactive Flow
identity. Inactivity explains rejection for that identity, not an assertion that all reported failures share a cause.
No inactive identity was reactivated automatically. A fresh user launch and matching deployed Flow failure record
are needed to establish any additional cause. Existing A01 acceptance is not invalidated or closed by these checks.
An additional network preflight could not complete its database checks; no outbox-readiness assertion is made from
that attempt. Historical successful counts are not proof of continuous current database availability.

## Operator procedure

1. Deploy Flow's diagnostic change and reproduce a fresh launch from Workspace (not a bookmarked/replayed token URL).
2. Record only the displayed reference, time and deployed revision.
3. Locate `workspace_launch_failed` with that reference in Flow Vercel runtime logs.
4. Follow the code-specific actions in the [handoff runbook](../runbooks/flow-handoff-troubleshooting.md).
5. Reconfirm approved entitlement before synchronizing an inactive identity; do not bypass signature, MFA, replay or
   identity checks, and do not manually force `isActive=true`.

## Deployment, verification and rollback

No migration, seed, new secret or environment variable. Redeploy Flow for the diagnostic UI/logging; Workspace
preflight is an operator CLI. Verification passed: 33 Flow security regressions, 94 Workspace regressions, Prisma
validation, TypeScript, lint, documentation checks and both production builds (including Workbook runtime traces).
Local tests do not replace staging acceptance. Roll back the application
commits if necessary; this removes diagnostics, not database identities, entitlements or revocations.
