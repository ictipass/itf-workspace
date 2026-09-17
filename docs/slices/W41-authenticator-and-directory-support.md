# W41 — Authenticator and directory support

Implemented 2026-09-17; documentation and Admin Help change only.
Commit: Workspace `b3a9ab5`.

Explains authenticator loss, stolen-device containment, controlled app/device migration and the currently missing
reset/recovery path. D43 records the unresolved approval/identity-proofing rules; no reset capability or MFA bypass is
introduced. Adds exact Flow directory-synchronization steps and describes capability-aware App Access placement as
future W17/W18 work, not an implemented generic connector.

Records ITF's A01-05 confirmation: both browser-profile Flow sessions reject protected pages after entitlement
revocation; Workspace retains a disabled Flow entry; OFFICER regrant and synchronization restore launch.

UI effect: new expandable topics in SYSTEM_ADMIN **Admin Help**.
References: [authenticator runbook](../runbooks/authenticator-loss-and-replacement.md),
[directory runbook](../runbooks/flow-directory-synchronization.md),
[policy decisions](../policy-decision-register.md), [acceptance](../acceptance/A01-staging-lifecycle-acceptance.md).

Verification: 100 Workspace regression cases, full configuration/schema/lint/build verification and 57-document link
check passed. No staff credentials or deployment secrets were changed.

Next: deploy and execute W42's A01-06/A01-07 diagnostics; approve D43 before implementing MFA recovery.
