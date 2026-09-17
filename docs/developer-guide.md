# ITF Workspace developer guide

## Purpose and boundaries

Workspace is the central staff entry point, application registry, entitlement authority and launch-assertion issuer.
During migration it authenticates staff directly from the ICT-administered HR master list. It is not currently an
enterprise identity broker, and non-staff identities require a separate policy decision.

Workspace grants access to an application and a child-app role. Each child application remains responsible for its
domain authorization. A disabled button is never the authorization boundary; launch and integration routes re-read
authoritative database state.

## Architecture map

| Area | Primary locations | Responsibility |
|---|---|---|
| Next.js routes and UI | `app/`, `components/` | Authentication pages, staff catalogue and administration workflows |
| Server-side authorization | `lib/auth/`, `proxy.ts` | Current-user validation, session state, route boundary and MFA freshness |
| Policy logic | `lib/policies/`, `lib/security/` | Stable, testable policy evaluation and cryptographic controls |
| Child integrations | `lib/integrations/` | Directory, app navigation, revocation and logout contracts |
| Data access | `lib/prisma.ts`, `prisma/schema.prisma` | PostgreSQL persistence through Prisma |
| Environment validation | `lib/config/workspace-environment.ts`, `instrumentation.ts` | Fail-fast stage-aware runtime configuration |
| Regression tests | `tests/` | Security, configuration, session and integration contracts |
| Operational evidence | `docs/` | Policy, slices, runbooks, gates and accepted staging evidence |
| In-product administrator help | `lib/support/admin-help-topics.ts`, `app/dashboard/admin/help/` | Typed concise procedures rendered only to system administrators |

## Core data model

- `User` is the authoritative Workspace identity. Its immutable database ID is the cross-application identifier;
  email and staff number are mutable attributes.
- `WorkspaceSession` records revocable, idle-bounded and absolute-bounded sessions. Maximum concurrent sessions and
  recovery grants are server-enforced.
- `App` is the application registry entry, including slug, URL, environment, status, launch audience, icon and
  application assurance classification.
- `AppRolePolicy` classifies each assignable child role as `STANDARD` or `SENSITIVE`. An active policy is mandatory.
- `AppAccess` grants one user one application role with lifecycle status.
- Organization entities (`Office`, `Department`, `Division`, `Unit`, `Position`) provide controlled HR references.
- `IntegrationOutboxEvent` durably records central logout, entitlement and role-change events before delivery.
- `AuditLog` records security and administrative transitions; retention/SIEM policy remains open under D33.

Read [Prisma schema](../prisma/schema.prisma) for exact fields and constraints.

## Authentication and sessions

Auth.js handles credential entry, but every protected operation uses authoritative current-user/session validation.
Current approved behavior:

- ordinary staff idle timeout: 20 minutes;
- privileged Workspace administrator idle timeout: 10 minutes;
- warning: two minutes before idle expiry;
- absolute session lifetime: three hours;
- maximum concurrent Workspace sessions: two;
- no trusted-device extension;
- temporary passwords must be replaced before ordinary access;
- `SYSTEM_ADMIN`, `APP_ADMIN`, sensitive apps and sensitive child roles require TOTP under D05;
- successful step-up remains fresh for ten minutes.

Child-app activity does not extend the Workspace session. Launch authorization always re-evaluates the current user,
session, entitlement, app status and assurance policy.

## Launch v2

Workspace signs a short-lived RS256 assertion and appends it to the configured child launch URL. The receiver must
validate signature, issuer, audience, type, version, timing, assurance and single use. Approved timing is 120 seconds
with 30 seconds of clock skew. Public keys are exposed through the versioned JWKS endpoint.

Development may use ephemeral signing. Staging uses a stable software or KMS key. Production requires the approved
non-exportable KMS/HSM integration; the adapter is deliberately not implemented yet, so production launch remains
blocked. See the [launch contract](workspace-launch-token.md) and [key policy](policies/2026-08-23-launch-assertion-key-management-policy.md).

## Staff onboarding

The current HR path is create-only and `STAFF`-only. It validates organization references and optional reporting
lines, generates random temporary passwords, creates all rows atomically and sends welcome email after commit.
Optional ITF Flow roles must match active role policies in the registry. Directory synchronization is a separate
administrator action.

This happy path is staging-accepted. Full lifecycle reconciliation, delivery retries, recovery/reissue and exits are
not complete. See the [staff onboarding runbook](runbooks/staff-onboarding.md) and W25 in the
[slice register](implementation-slice-register.md).

## ITF Flow integration

ITF Flow currently has four Workspace-facing behaviors:

1. signed, single-use launch assertion redemption;
2. versioned directory synchronization;
3. authenticated central session/entitlement events through the durable outbox;
4. entitled-app navigation for the child-app waffle.

Flow-specific environment variables and code still exist. Do not copy that implementation for each new app. Gate C
requires W10, W15, W17 and W18 so roles, effective entitlements, connector endpoints and retries become repeatable and
registry-driven. Follow the [child-app onboarding runbook](runbooks/child-app-onboarding.md).

## Staff creation and handoff diagnosis

Manual and CSV onboarding use `createWorkspaceStaff` in `lib/services/workspace-user-bulk-import.service.ts`; manual
input schema/action/UI live in `lib/policies/single-staff-onboarding.ts` and `app/dashboard/admin/users/new/`. The manual
entry grants no app roles, derives `STAFF` on the server, and records source evidence. Post-commit delivery failures
are returned separately from validation/creation failures, not automatically retried.

Flow launch failure logging uses server-generated UUID references and allow-listed stage/code categories. For the
cross-repository read-only preflight and deployed diagnostic procedure, see the
[handoff troubleshooting runbook](runbooks/flow-handoff-troubleshooting.md). The signed handoff protocol is unchanged.

## Local setup

1. Copy `.env.example` to a local `.env` and replace placeholders.
2. Create `itf_workspace_db` in PostgreSQL.
3. Install dependencies from the lockfile.
4. Generate Prisma Client and apply development migrations.
5. Use the development seed only in a disposable/local environment.
6. Start the application.

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

The seed manages bootstrap data and must not be used as the mechanism for changing staging/production policy. The
controlled first-administrator process is documented separately in
[initial administrator bootstrap](initial-administrator-bootstrap.md).

## Database changes

- Edit `prisma/schema.prisma` only when persistence changes are required.
- Create a named development migration and inspect its SQL.
- Never use `prisma db push` as a substitute for reviewed production migrations.
- Apply committed migrations to staging/production with `prisma migrate deploy` through the controlled deployment
  process.
- Record forward deployment, data impact and rollback in the slice document.
- Do not place seed credentials in deployed runtime environment variables.

## Configuration

Runtime configuration is stage-aware and validated during instrumentation. Vercel Preview and Production do not
derive organizational stage from `NODE_ENV`; `WORKSPACE_DEPLOYMENT_STAGE` is explicit. Invalid or incomplete deployed
configuration fails closed.

Use [the environment reference](environment-reference.md), `.env.example` and the configuration regression tests.
Do not use `.env.example-workspace`; it is a legacy reference using older names and is not the current deployment
template.

## Verification

Focused development checks:

```bash
npm test
npm run lint
npm run docs:check
npm run build
```

Full handoff check:

```bash
npm run verify
```

The build includes TypeScript, documentation link validation and organization-workbook deployment-trace validation.
Security-sensitive changes require negative tests proving denial, not only a successful case.

When an administrator workflow or support-visible failure changes, update both the Markdown source guidance and the
typed in-product help topic in the same delivery. The in-product page must describe only implemented behavior and must
not expose environment secrets, staff data or internal-only diagnostics.

## Deployment and rollback

- Keep development, staging and production databases, secrets, origins and signing keys separate.
- Run the stage-specific configuration check before deployment.
- Apply migrations before code only when the migration is backward compatible; otherwise document the exact phased
  sequence.
- Confirm `/login`, JWKS and health/integration probes appropriate to the release.
- Execute the slice's staging acceptance steps and retain only redacted evidence.
- Roll back code through a focused revert. Data rollback requires an explicitly documented and approved procedure.

See [Vercel deployment environments](vercel-deployment-environments.md).

## Engineering rules

- Keep authorization and classification checks server-side.
- Treat every child response and imported file as untrusted input.
- Use immutable Workspace user IDs across applications.
- Version external contracts and enforce audience/target binding.
- Queue security transitions transactionally before attempting remote delivery.
- Keep operational settings configurable and validated; do not hard-code child role catalogues or deployment URLs.
- Preserve unrelated user changes in a dirty worktree.
- Update documentation according to the [documentation governance standard](documentation-governance.md).

## Known incomplete areas

W42/Flow S23E add a temporary stage/pin/UTC-expiry-gated acceptance profile, not a new general-purpose production API.
The [diagnostic procedure](acceptance/A01-staging-diagnostic-operations.md) describes fixed receiver endpoints,
redacted evidence, filtered queue claims and cleanup. No schema migration is required.
MFA recovery remains gated by D43; no reset is implied by the
[authenticator support documentation](runbooks/authenticator-loss-and-replacement.md).

Consult the slice register for details. Major current gaps include login abuse/recovery policy, SSRF policy, security
headers/deployment topology, full staff lifecycle, scalable access governance, generic connectors, continuous retry
operation on the selected hosting tier, SIEM/retention, resilience, disaster recovery, production KMS signing and
enterprise federation.
