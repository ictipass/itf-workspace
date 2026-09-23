# ITF Workspace enterprise-readiness roadmap

Status: **Living roadmap — Workspace is in integrated ITF Flow staging, not production-ready**

## Next practical outcome

ITF has accepted A01's finite staging lifecycle checks, including duplicate delivery and outage/retry recovery, and
has accepted W43 governed authenticator recovery on 2026-09-23. Workspace and ITF Flow have therefore met Gate A for
integrated staging. A continuously scheduled worker is still required before pilot/production operation.

The next practical production outcome is W05: resist password spraying and repeated guessing while producing
accountable authentication-security events. It needs ITF approval of D08-D11 before implementation can start.

## Remaining route to enterprise production

| Stage | Practical outcome | Remaining slices/decisions |
|---|---|---|
| Close Flow staging | Prove access also fails and recovers safely, not only that login works | Accepted 2026-09-21; continuous outbox scheduler remains |
| Secure controlled pilot | Resist password attacks, unsafe outbound URLs and browser/proxy abuse; establish accountable pilot operation | W05 with D08-D11; W06 with D12; W09 with D13-D14; G01, G02, G05 and G07 |
| Complete staff lifecycle | Handle failed welcome delivery, authenticator/password recovery, corrections, transfers, suspension/exits and privileged-role administration | W43 is accepted; finish W25 and approve D10 plus the applicable HR/role ownership decisions |
| Scalable access governance | Replace one-off direct grants with governed roles, groups, rules, time limits, approvals, reviews and separation of duties | W10-W16 after D15-D30 |
| Repeatable app integration | Configure each child connector and its retries/reconciliation from the registry instead of adding Flow-specific code | W17 configurable connectors; W18 generic outbox/reconciliation; conformance profile; A02-A05 |
| Enterprise identity | Move from transitional Workspace passwords/custom handoff to an approved identity provider and standards-based app onboarding | W19-W24; D31; provider/procurement decision; OIDC/PKCE and SCIM or approved provisioning standard |
| Production assurance | Operate keys, audit, resilience, privacy and recovery at an approved enterprise level | Production KMS/HSM adapter; D33-D35; G01-G08; backup restore, DR, key rotation, rollback and load/failover exercises |

Production readiness requires the relevant items to be implemented or explicitly deferred by the accountable ITF
authority with a time-bound risk acceptance. A successful staging launch or registry entry is not production approval.

## What a fully integrated child app receives

A registered app currently receives catalogue visibility and Workspace-side entitlement controls. A fully integrated
app additionally implements four server-enforced contracts:

1. **Provisioning/reconciliation API:** Workspace supplies immutable user ID, approved child role, active status and
   permitted organization attributes. The child stores its own user/role mapping and rejects unknown roles.
2. **Signed launch receiver:** Workspace redirects the browser with a short-lived, audience-bound, single-use signed
   assertion. The child verifies Workspace's public JWKS, exact claims and assurance, consumes it once and creates its
   own revocable session.
3. **Navigation API:** the child's backend asks Workspace for the user's current entitled apps using the immutable
   Workspace user/session identifiers and a per-app credential. The child renders the returned list as a waffle; every
   selection routes back through Workspace authorization.
4. **Session/revocation event API:** Workspace pushes global logout, role/access changes and account deactivation. The
   child processes each event transactionally and idempotently so retries are safe.

Each child also needs small UI integration: the waffle, a child-only sign-out that returns to the Workspace catalogue,
a separate global sign-out option, and a Workspace-login link on public staff-entry pages. These can become reusable
components/adapters, but the child remains responsible for its own domain permissions and local session enforcement.

## Target repeatable onboarding architecture

W17/W18 and the application onboarding kit should replace Flow-specific variables with registry-managed connector
profiles. Each environment/app profile should identify versioned endpoints, audience, role catalogue, assurance,
timeouts, retry policy, credential references and supported capabilities. Per-app secrets remain in the deployment
secret manager; they are never displayed or stored as ordinary registry text.

Developers should receive:

- versioned request/response schemas and validation fixtures;
- reference launch, provisioning, navigation and revocation adapters;
- reusable waffle and sign-out components that can be styled to match the child app;
- negative/security and conformance tests;
- environment and rollout checklist, monitoring signals and rollback procedure.

Until that platform exists, new registry entries are useful for discovery and Workspace-side access display, but each
app needs an explicitly reviewed integration implementation. Do not copy Flow credentials or share `AUTH_SECRET`;
every child owns its own session secret and receives separate per-purpose, per-environment integration credentials.
