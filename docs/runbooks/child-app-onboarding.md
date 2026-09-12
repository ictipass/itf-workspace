# Child-application onboarding runbook

Status: **ITF Flow-specific integration implemented in staging; repeatable onboarding platform not yet complete**

## Purpose

Define the technical, policy and operational work required to onboard an ITF enterprise application through
Workspace without mistaking a registry tile for full security integration.

## What “fully onboarded” means

An app is fully onboarded only when:

- its owner, data classification, roles/scopes and assurance rules are approved;
- its environment-specific registry entry is active and correct;
- entitled identities are provisioned and reconciled;
- signed Workspace launches are validated and single-use;
- role/assurance changes, revocation and logout terminate access correctly;
- the child app exposes entitled app navigation and Workspace entry/logout behavior;
- monitoring, retries, key rotation, support, rollback and incident handling are operational;
- staging/pilot/production readiness gates have recorded evidence.

Seeing an enabled catalogue button proves only that Workspace found an active entitlement and role policy.

## Current platform limitation

ITF Flow is the reference integration, but its directory, navigation and event configuration still contains
Flow-specific code and environment variables. Client Reimbursement, SIWES, PromoIntel and third-party apps must not be
copied into those hard-coded paths. Repeatable onboarding requires Gate C, including W10, W15, W17 and W18.

## Phase 1 — intake and policy

The app owner must supply and approve:

| Input | Why it is required |
|---|---|
| Business/service owner and technical owner | Approval, support and incident accountability |
| User populations | Separate staff from clients, students, partners or public identities |
| Data classification and privacy assessment | Determine payload, logging and assurance restrictions |
| Role/scope catalogue | Prevent arbitrary or unrecognized role strings |
| Role owner and approvers | Govern grant, change and revocation |
| App and per-role assurance | Apply D05 `STANDARD`/`SENSITIVE` behavior |
| Availability/RTO/RPO | Determine Workspace dependency and degraded mode |
| Audit/retention requirements | Establish evidence and SIEM delivery |
| Environments and approved domains | Prevent cross-environment trust and unsafe URLs |
| Logout/revocation expectation | Define termination semantics |

Open decisions D12 and D15-D35 may block some or all onboarding stages. SIWES additionally requires D32 before its
staff/external identity boundary is designed.

## Phase 2 — child-app technical preparation

The child app must implement:

1. A public HTTPS launch receiver for the versioned Workspace assertion.
2. RS256/JWKS verification with exact issuer, audience, type, algorithm, version and timing enforcement.
3. Atomic single-use assertion redemption.
4. Mapping by immutable `workspaceUserId`, never email as the cross-system key.
5. Exact role recognition and fail-closed role mismatch behavior.
6. A versioned authenticated provisioning/reconciliation receiver.
7. A versioned authenticated session/entitlement-event receiver with idempotency.
8. Workspace-bound session metadata so global logout can target the correct child session.
9. A child-app waffle that requests only currently entitled apps and routes selections through Workspace launch.
10. Child-only sign-out plus the separate global Workspace sign-out option.
11. A clear Workspace-login link from public/staff-login pages when local staff login is unavailable.
12. Health/readiness endpoints and correlation IDs that disclose no secrets.

Use the [launch contract](../workspace-launch-token.md) and ITF Flow's accepted implementation as a reference, not as
authorization to reuse its secrets, audience or URLs.

## Phase 3 — Workspace registry and connector configuration

For each environment, configure:

- unique lowercase slug;
- name, description, category and curated icon;
- exact launch URL;
- unique launch audience;
- environment and status;
- application assurance;
- every assignable role and its assurance classification;
- connector endpoints and independently generated service credentials;
- retry/timeout/batch settings within approved bounds;
- public verification keys and rotation overlap where applicable.

Currently only ITF Flow has implemented connector wiring. Other apps require W17 rather than adding another set of
hard-coded environment variables.

## Phase 4 — staging acceptance

Use a dedicated ordinary test identity and non-sensitive data. At minimum prove:

1. readiness and public launch-route boundary;
2. directory create and update;
3. successful launch with correct identity/role;
4. wrong issuer, audience, algorithm, signature, timing and role rejection;
5. replay rejection;
6. role-change mismatch before reconciliation and success afterward;
7. standard-to-sensitive assurance increase and fresh TOTP;
8. entitlement and user-status revocation;
9. child-only and global logout;
10. duplicate event idempotency;
11. receiver outage, durable retry and eventual delivery without access resurrection;
12. key rotation overlap/emergency behavior;
13. waffle navigation and direct staff-entry links;
14. audit, correlation and redacted support evidence;
15. accessibility and supported browser/device behavior.

Do not retain launch assertions or credentials in evidence. Use the
[A01 lifecycle runbook](../acceptance/A01-staging-lifecycle-acceptance.md) for the current ITF Flow exercise.

## Phase 5 — controlled pilot

Gate B additionally requires login abuse controls, SSRF controls, browser/deployment trust policy, threat/security
review, privacy approval, SIEM/audit operations, pilot support ownership and rollback rehearsal. A successful staging
launch is not pilot approval.

## Phase 6 — production

Production requires the applicable Gates A-D and G01-G08, production KMS/HSM signing, backup/restore and disaster
recovery evidence, continuous revocation retry, key-rotation rehearsal, monitoring/alerting, incident ownership,
change approval and rollback rehearsal.

## Environment and secret rules

- Never share credentials across development, staging and production.
- Use a distinct credential per contract/purpose; do not reuse directory, event, navigation or worker secrets.
- Keep private signing material out of the repository and logs.
- Production signing keys must be non-exportable in the approved KMS/HSM.
- Validate exact HTTPS origins and endpoints; do not use wildcard trust.
- Rotate any credential disclosed in chat, screenshots, logs or source immediately.

## Evidence pack

For each onboarded app retain:

- approved intake/policy references;
- registry values excluding secrets;
- contract versions and deployed commit hashes;
- database migration versions;
- test and build results in both repositories;
- staging case results with times/correlation IDs and redacted log references;
- key/credential rotation record;
- support and incident runbook owner;
- rollback result;
- gate approvals and unresolved risks.

## Application order

The approved incremental order is ITF Flow, Client Reimbursement, SIWES staff-facing boundary and PromoIntel, followed
by third-party/new applications. This order does not waive Gate C or app-specific policy decisions. Consult the
[implementation register](../implementation-slice-register.md) for current status.
