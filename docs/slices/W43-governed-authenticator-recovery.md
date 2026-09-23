# W43 — Governed authenticator lifecycle and recovery

Status: **Implemented and staging accepted on 2026-09-23**
Policy: [D43 Option A directive](../policies/2026-09-21-authenticator-lifecycle-recovery-directive.md)

## Outcome

Workspace now supports:

- ten cryptographically random, once-displayed and user-bound hashed recovery codes after enrollment/regeneration;
- rate-limited password-plus-recovery-code recovery;
- voluntary replacement requiring the current password, fresh old TOTP and verification of the new TOTP secret;
- invalidation of old secrets/codes and every Workspace session, with connected-child revocation events;
- mandatory TOTP re-enrollment after assisted/code recovery;
- appointed HR Identity Verifier, ICT Security Approver and ICT Recovery Operator responsibilities;
- ordinary recovery after in-person HR verification and independent SYSTEM_ADMIN execution;
- privileged recovery after distinct HR verification, ICT Security approval and independent execution;
- a sole-administrator route through the appointed ICT Recovery Operator;
- official-email security notifications and explicit audited notification failures; and
- updated Admin Help, runbook, policy, developer/support and environment documentation.

Independent secondary authenticators are approved by D43 but deliberately remain a later first-class factor-model
increment. Cloud backup is an external ICT-managed control, not a Workspace setting.

## Data and configuration

Apply migration `20260921090000_add_governed_mfa_recovery`. It adds recovery-code hashes, authority assignments,
recovery requests, forced-enrollment/rate-limit state and audit/session-revocation enum values. Existing TOTP secrets
are not changed.

Optional non-secret settings:

- `WORKSPACE_MFA_RECOVERY_MAX_ATTEMPTS` (default `5`, allowed `3–10`)
- `WORKSPACE_MFA_RECOVERY_LOCK_MINUTES` (default `30`, allowed `5–1440`)

No new secret is required.

## Staging acceptance

- [x] Apply the migration and redeploy Workspace.
- [x] Existing enrolled user generates codes; only one display occurs and regeneration invalidates the old set.
- [x] Working-factor replacement rejects bad password/old/new code and succeeds only after all three checks.
- [x] Replacement ends all Workspace and Flow sessions, sends notice and allows sign-in with the new factor only.
- [x] Saved-code recovery consumes one code, enforces retry lock, ends all sessions and forces new enrollment.
- [x] Appoint three different authority holders and confirm self-assignment/multiple-role assignment is rejected.
- [x] Ordinary recovery works after HR verification plus different SYSTEM_ADMIN execution without security approval.
- [x] Privileged recovery cannot execute without a distinct ICT Security approval and distinct executor.
- [x] Sole-administrator rehearsal succeeds only through the appointed ICT Recovery Operator after both approvals.
- [x] Expired/rejected/completed requests cannot execute; audit contains actor IDs and non-secret references.
- [x] Notification failure does not restore an old factor/session and is visibly reported/audited.

Acceptance: **Passed in ITF staging on 2026-09-23.** This closes the finite W43 recovery acceptance scope. It does
not add independently enrolled secondary factors or a durable notification-retry worker; those remain later hardening
increments.

Do not use production identities for these tests. Sanitized evidence must contain no password, TOTP, QR/setup secret or
recovery code.
