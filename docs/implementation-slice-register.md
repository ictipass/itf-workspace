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
| W01 | Authoritative current-user validation | In progress | Full lint and production build pass; W08 regression coverage remains. See [`slices/W01-authoritative-current-user.md`](slices/W01-authoritative-current-user.md) |
| W02 | Revocable Workspace sessions and session inventory | Policy gate | D01-D04: IdP direction, idle/absolute lifetimes and concurrent-session policy |
| W03 | Workspace launch v2 issuer aligned with ITF Flow | Policy gate | W02 plus D01, D05-D07: authentication assurance, token lifetime and key management |
| W04 | Immediate central logout and entitlement-revocation delivery to ITF Flow | Planned | W02-W03; transactional outbox and ITF Flow session-event contract |
| W05 | Login abuse protection and authentication security events | Policy gate | D08-D11: throttling, lockout, recovery and alerting policy |
| W06 | App URL and outbound-request SSRF protection | Policy gate | D12: permitted domains/networks and operational exception process |
| W07 | Secure configuration validation and removal of unsafe credential defaults | Ready | Preserve local-development usability without production fallback secrets |
| W08 | Workspace security regression test foundation | Planned | Begins with W01 and expands with each Phase 1 slice |
| W09 | Security headers, browser policy and deployment trust boundary | Policy gate | D13-D14: hosting topology, proxy/CDN and permitted origins |

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
| A01 | ITF Flow launch v2, provisioning and revocation integration | Planned | W02-W04; existing Flow S23 receiver is the reference implementation |
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

1. Establish W08 regression coverage and complete W01.
2. Complete W07 before further authentication changes.
3. Resolve D01-D07, then design W02 and W03 together so Workspace and ITF Flow share one approved contract.
4. Deliver W04 before treating Workspace logout or entitlement revocation as centralized.
5. Resolve W05, W06 and W09 production gates.
6. Start Phase 2 governance before onboarding more than ITF Flow.

**Next best implementable slice:** W08 — Workspace security regression test foundation. It has no unresolved ITF policy
dependency and is required to complete W01 safely.

**Current child-app readiness:** Not yet integration-development-ready. W00 is complete; W01, W02-W04, W07-W08 and
D01-D07 remain on the ITF Flow reassessment gate.

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
