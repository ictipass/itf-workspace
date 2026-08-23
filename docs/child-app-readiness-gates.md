# ITF Workspace child-application readiness gates

This document defines when Workspace is technically mature enough to integrate child applications. It separates
integration development from pilot and production readiness so early technical work is not mistaken for operational
approval.

These are engineering minimums. ITF policy owners may add requirements, and no technical gate overrides formal
security, privacy, infrastructure or management approval.

## Gate A — ITF Flow integration reassessment

When Gate A is satisfied, Workspace and ITF Flow should be reassessed together and their existing integration code and
contracts updated as one bounded implementation. This is the point to begin full staging integration, not production
rollout.

Required:

- W00 dependency-security remediation is Implemented.
- W01 authoritative current-user validation is Implemented with regression coverage.
- W02 revocable Workspace sessions is Implemented.
- W03 Workspace launch v2 contract is Implemented and agrees with ITF Flow's receiver.
- W04 central logout and entitlement-revocation delivery is Implemented.
- W07 secure configuration validation is Implemented.
- W08 security regression foundation covers session, entitlement, launch, replay and revocation behavior.
- D01-D07 are approved and recorded.
- Workspace and ITF Flow contract tests pass in both repositories.
- Development and staging use environment-specific credentials; no production secret is shared with them.

Current status: **Not met**. W00-W02, W07 and the W08 foundation are complete; D01-D07 are approved.
W03-W04, expanded entitlement/assurance/launch/replay/revocation coverage, cross-repository
contract tests and environment-separated credentials remain.

When the final item is satisfied, the slice handoff must explicitly state: **Workspace is ready for ITF Flow
integration reassessment.**

## Gate B — Controlled ITF Flow pilot

Gate B permits a limited, monitored pilot with approved staff after the integrated staging flow has passed acceptance
testing.

Required:

- Gate A is satisfied and the joint ITF Flow integration slice is Implemented.
- W05 login abuse protection and authentication security events is Implemented.
- W06 app URL and outbound-request SSRF protection is Implemented.
- W09 browser security headers and deployment trust boundary is Implemented.
- ITF Flow provisioning, launch, single-use redemption, role mismatch, central logout and revocation tests pass.
- G01 threat model/security review has no unresolved pilot-blocking finding.
- G02 privacy/data-classification review approves the integration payload.
- G05 audit/SIEM requirements needed for the pilot are operational.
- G07 pilot scope, support ownership and incident runbook are approved.
- Pilot rollback and direct child-app access behavior are documented and rehearsed.

## Gate C — Repeatable child-app onboarding

Gate C means the platform can onboard Client Reimbursement, the staff-facing SIWES boundary, PromoIntel and future
applications through a repeatable mechanism rather than new hard-coded integration logic for each app.

Required:

- Gate B has produced accepted operational evidence.
- W10 first-class application roles/scopes is Implemented.
- W15 effective-entitlement evaluation is Implemented and shared by UI, launch, provisioning and audit.
- W17 configurable application connector registry is Implemented.
- W18 durable integration outbox, retry and reconciliation is Implemented.
- The child-app onboarding profile and conformance tests are versioned and documented.
- Application-specific policy decisions, including D32 for SIWES, are approved before that application starts.

## Gate D — Production platform readiness

Gate D allows Workspace to be considered the production entry point for approved enterprise applications.

Required:

- Gates A-C are satisfied for each application entering production.
- The applicable Phase 2 access-governance controls are implemented or have explicit approved deferrals.
- Enterprise federation and provisioning decisions are implemented through W19-W23.
- Production local-password and query-token retirement criteria in W24 are satisfied or have an approved time-bound
  migration exception.
- G01-G08 have recorded evidence and accountable sign-off.
- D33-D35 establish audit retention, permitted integration data, availability, RTO and RPO.
- Backup restoration, disaster recovery, key rotation, central logout and entitlement revocation have been exercised
  in the production-like environment.

## Readiness reporting rule

Every completed slice handoff must state:

1. the highest gate currently satisfied;
2. the remaining items for the next gate;
3. whether Workspace is ready for ITF Flow reassessment, controlled pilot, repeatable onboarding or production;
4. the next best implementable slice and any policy/external blocker.
