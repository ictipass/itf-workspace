# ITF Workspace implementation slice register

This is the authoritative, conversation-independent record for Workspace and its integration with ITF applications.
Separate chats must update this register when they change an integration contract, dependency, status, or verification
result. Repository code, migrations and commits remain the final implementation evidence.

## Status definitions

- **Implemented**: code, migration and documentation exist; required verification passed; commit evidence is recorded.
- **Implemented locally**: implementation exists in the working tree and applicable verification passed, but it is not committed.
- **In progress**: implementation has started but the slice does not meet its acceptance criteria.
- **Ready**: scope and acceptance criteria are approved and all policy decisions needed to start are resolved.
- **Policy gate**: implementation must not start until the listed ITF policy decision is approved.
- **Planned**: outcome is known, but detailed design or dependencies are incomplete.
- **External gate**: depends on an approved provider, production service, third party, or organizational sign-off.

## Governing rules

1. ITF policy decisions are recorded in [`policy-decision-register.md`](policy-decision-register.md); code must not silently choose them.
2. Security enforcement must be server-side. Disabled or hidden UI is never an authorization boundary.
3. Identity uses an immutable central identifier. Email and staff number are attributes, not cross-system primary keys.
4. Workspace grants an application entitlement and an approved app role; each child app enforces its domain permissions.
5. Authentication, entitlement and provisioning contracts are versioned and backward compatibility is explicit.
6. Security-sensitive settings are configurable, validated at startup and assigned approved production behavior.
7. Every slice records tests, migration requirements, operational effects, rollback and production gates.
8. No slice is marked Implemented when required validation could not run.
9. Every completed implementation is committed as a focused change. Its handoff must briefly state what was
   implemented, what changed, the operational use case/effect, whether visible UI changed, verification results and
   the commit hash. It must also name the next best implementable slice and identify any gate blocking it.
10. Child-application readiness is evaluated against [`child-app-readiness-gates.md`](child-app-readiness-gates.md).
    Completing code does not override an open ITF policy, assurance or production-approval gate.

## Phase 1 — secure the current foundation

| ID | Slice | Status | Dependency or evidence |
|---|---|---|---|
| W00 | Production dependency advisory remediation | Implemented | `acf76c5`; runtime audit reports zero known vulnerabilities. See [`slices/W00-dependency-security-baseline.md`](slices/W00-dependency-security-baseline.md) |
| W01 | Authoritative current-user validation | Implemented | `16dcefc`, regression evidence `444287a`; full verification passes. See [`slices/W01-authoritative-current-user.md`](slices/W01-authoritative-current-user.md) |
| W02 | Revocable Workspace sessions and session inventory | Implemented | `1483531`; DB-authoritative revocation, expiry, two-session recovery and inventory; 32-test suite passes. See [`slices/W02-revocable-workspace-sessions.md`](slices/W02-revocable-workspace-sessions.md) |
| W03 | Workspace launch v2 issuer aligned with ITF Flow | Implemented | Workspace `9cbec46`, `42c4f3b`, `4c88f89`, QR enrollment `ca8b88b`; ITF Flow `f0696bc`; RS256/JWKS, assurance/TOTP, single-use receiver and contract tests. See [`slices/W03-workspace-launch-v2.md`](slices/W03-workspace-launch-v2.md) |
| W04 | Immediate central logout and entitlement-revocation delivery to ITF Flow | Implemented | Workspace `c8d3605`, `6427f98`; ITF Flow `30ace13`, `7a3a849`; transactional outbox, bounded immediate/retry delivery and atomic idempotent receiver. See [`slices/W04-central-revocation-delivery.md`](slices/W04-central-revocation-delivery.md) |
| W05 | Login abuse protection and authentication security events | Policy gate | D08-D11: throttling, lockout, recovery and alerting policy |
| W06 | App URL and outbound-request SSRF protection | Policy gate | D12: permitted domains/networks and operational exception process |
| W07 | Secure configuration validation and removal of unsafe credential defaults | Implemented | `2caeede`; startup and command validation, production fail-closed behavior and 11 regression tests. See [`slices/W07-secure-configuration-validation.md`](slices/W07-secure-configuration-validation.md) |
| W08 | Workspace security regression test foundation | Implemented | Expanded through the W09 local proxy-origin increment; 44 Workspace tests across eight suites plus 21 ITF Flow security tests cover authoritative users, configuration, bounded sessions, launch v2, assurance/TOTP/QR, immutable provisioning, revocation, HR-import role boundaries and exact Server Action origins. See [`slices/W08-security-regression-foundation.md`](slices/W08-security-regression-foundation.md) |
| W09 | Security headers, browser policy and deployment trust boundary | Policy gate | Local exact-origin configuration `a6a90ab` fixes approved development proxies without broadening trust; D13-D14 still govern production hosting, proxy/CDN and permitted origins |
| W25 | Staff master-list onboarding and credential lifecycle | In progress | First control `ce680e0`: HR imports are `STAFF`-only and actual imports require fresh TOTP. Durable credential delivery/reissue, privileged-role workflow and HR lifecycle reconciliation remain. See [`slices/W25-staff-master-list-onboarding.md`](slices/W25-staff-master-list-onboarding.md) |

## Phase 2 — scalable access governance

| ID | Slice | Status | Dependency or policy gate |
|---|---|---|---|
| W10 | First-class application roles and scopes | Policy gate | D15-D17: role ownership, naming and compatibility rules |
| W11 | Groups and group-derived entitlements | Policy gate | D18-D19: authoritative group source and precedence |
| W12 | Organization-rule entitlements | Policy gate | D20: whether organization attributes may grant access automatically |
| W13 | Time-bound direct access and emergency access | Policy gate | D21-D23: approvers, duration and break-glass process |
| W14 | Access request and approval workflow | Policy gate | D24-D27: requester eligibility, approvers, delegation and SLA |
| W15 | Effective-entitlement evaluation service | Planned | W10-W14; shared path for UI, launch, provisioning and audit |
| W16 | Access certification and separation-of-duties controls | Policy gate | D28-D30: review frequency, reviewers and incompatible roles |
| W17 | Configurable application connector registry | Planned | W10, W15; removes ITF Flow-specific integration hard-coding |
| W18 | Durable integration outbox, retries and reconciliation | Planned | W17; configurable bounded worker policy |

## Phase 3 — enterprise federation

| ID | Slice | Status | Dependency or external gate |
|---|---|---|---|
| W19 | Enterprise IdP selection and trust architecture | External gate | D01 and procurement/security approval |
| W20 | Workspace OIDC client integration | Planned | W19; Authorization Code flow, PKCE, MFA/assurance claims |
| W21 | Child-app OIDC onboarding profile | Planned | W19-W20; redirect, logout, claims and key-rotation contract |
| W22 | Automated provisioning standard | External gate | D31: SCIM 2.0 versus approved versioned internal contract |
| W23 | Central logout, revocation and key-rotation operations | Planned | W19-W22 |
| W24 | Retire production local-password and query-token login paths | Planned | All staff-facing apps migrated and rollback approved |

## Phase 4 — application onboarding order

| ID | Application slice | Status | Dependency |
|---|---|---|---|
| A01 | ITF Flow launch v2, provisioning and revocation integration | In progress | Code complete: Workspace `1a08a5b`, Flow `02b433d`; bounded child sessions, immutable/versioned provisioning and lifecycle revocation pass 61 joint contract/security tests. Environment-separated staging configuration and acceptance remain. See [`slices/A01-itf-flow-integration-reassessment.md`](slices/A01-itf-flow-integration-reassessment.md) |
| A02 | Client Reimbursement staff integration | Planned | A01 lessons plus W17/W21 onboarding contract |
| A03 | SIWES staff-facing integration | Policy gate | A01; D32 separates staff and external SIWES identities |
| A04 | PromoIntel staff integration | Planned | A01 lessons plus W17/W21 onboarding contract |
| A05 | Third-party application onboarding kit and conformance tests | Planned | At least two successful first-party integrations |

## Cross-cutting production gates

| ID | Gate | Status |
|---|---|---|
| G01 | Threat model and independent security review | Planned |
| G02 | Privacy and data-classification review | Policy gate |
| G03 | Load, resilience and failover evidence | Planned |
| G04 | Backup restoration and disaster-recovery evidence | Planned |
| G05 | Central audit/SIEM integration and retention approval | Policy gate |
| G06 | Accessibility and supported-device verification | Planned |
| G07 | Pilot rollout, support ownership and incident runbook | Planned |
| G08 | Production change approval and rollback rehearsal | Planned |

## Current execution order

1. Configure environment-separated staging credentials and run the joint A01 ITF Flow acceptance exercise.
2. Exercise provisioning, launch, replay, role/assurance changes, immediate/duplicate revocation and outage/retry in staging to close A01 and Gate A.
3. Resolve W05, W06 and W09 production gates.
4. Start Phase 2 governance before onboarding more than ITF Flow.

**Next best implementable slice:** complete A01 through joint ITF Flow staging acceptance, once Infrastructure supplies
separate staging launch/directory/interoperability/worker configuration and an approved scheduler. If that external
configuration is not yet available, prepare W05 by resolving D08-D11.

**Current child-app readiness:** The Workspace code foundation is mature enough for integrated ITF Flow staging, but
Gate A is not formally met. A01's cross-repository code and contract coverage are complete. Environment-separated
staging credentials and full staging lifecycle evidence remain; production signing additionally requires the approved
KMS/HSM adapter.

## Cross-chat handoff protocol

Before modifying Workspace or a child integration, read this register and the relevant detailed slice document. Record:

- repository and starting commit;
- pre-existing working-tree changes;
- slice ID and approved policy decisions;
- affected contracts and applications;
- migrations and environment variables;
- verification commands and results;
- remaining gates and the next safe action.

Update this register in the same change as any material status change. Do not depend on chat history as implementation evidence.
