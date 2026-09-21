# Authenticator lifecycle and recovery directive

Decision: **D43 — Approved interim policy (Option A)**  
Effective date: **2026-09-21**  
Approving authority: **Super administrator**  
Reference: **Project architecture directive**

## Purpose

This directive governs voluntary authenticator replacement, recovery after loss or compromise, recovery codes,
authority separation, session containment and the sole-administrator case. It does not weaken D05: privileged
Workspace roles and sensitive child-app access continue to require TOTP.

## Self-service methods

- A user who still controls the enrolled authenticator may replace it only after entering the current Workspace
  password and a fresh code from the old authenticator. Workspace verifies a code from the new secret before replacing
  the old secret.
- A user may recover with the current password plus one valid saved recovery code. A code is cryptographically random,
  stored only as a user-bound hash, shown once and consumed once. Reissuing a set invalidates every prior unused code.
- After either method, Workspace invalidates the previous factor/recovery set, terminates every Workspace session,
  emits connected-child session revocations, notifies the official email address and records auditable security events.
- A recovery-code attempt is temporarily locked after the configured failure threshold. Codes, passwords, TOTP values,
  QR images and setup keys must never be entered in tickets, chat, email or approval references.

## Assisted recovery responsibilities

Authority assignment itself requires a `SYSTEM_ADMIN`, fresh TOTP and an approval reference. An authority holder must
be an active staff user with TOTP and may hold only one active recovery authority role.

| Responsibility | Authorized role | Required control |
|---|---|---|
| Verify identity | `HR_IDENTITY_VERIFIER` | In-person identification against the authoritative HR staff record; record a non-secret HR reference |
| Approve privileged recovery | `ICT_SECURITY_APPROVER` | Independently review privileged-account recovery and record an approval reference |
| Execute ordinary recovery | A different authorized `SYSTEM_ADMIN` | HR verification must be valid and unexpired |
| Execute privileged recovery | A different authorized `SYSTEM_ADMIN` | HR verification plus ICT Security approval; executor cannot be the user, verifier or approver |
| Execute sole-administrator recovery | `ICT_RECOVERY_OPERATOR` | Joint HR verification and ICT Security approval; operator cannot be the user, verifier or approver |

Ordinary `STAFF` recovery needs HR verification and independent execution but not ICT Security approval. `APP_ADMIN`
and `SYSTEM_ADMIN` recovery needs both HR and ICT Security. No user may verify, approve or execute their own assisted
recovery. Privileged recovery cannot be self-approved. Requests expire after 24 hours and must be restarted after
expiry.

Execution clears the old TOTP secret and recovery codes, terminates all central sessions and connected-child sessions,
and marks the account for mandatory new TOTP enrollment at the next login. It does not change the password, role,
organization placement or app entitlements.

## Additional authenticators and backups

- Independently enrolled secondary authenticators are permitted by policy but require a later first-class
  multi-authenticator implementation; copying one TOTP secret to two devices is not independent enrollment.
- Authenticator cloud backup is permitted only for an ICT-approved provider, organizational account and device-control
  profile. Restoring a copied secret does not revoke a lost copy; suspected loss or compromise still requires secret
  replacement and session containment.
- There is no universal bypass, emailed MFA code or direct-database reset. Email is notification only.

## Operational prerequisites

Before production, appoint different people to all three recovery authority roles, test ordinary, privileged and
sole-administrator recovery in staging, verify child-session revocation, verify notification delivery/failure handling,
store codes through an approved method, and retain evidence without authentication secrets.

This directive is informed by [NIST authenticator lifecycle guidance](https://pages.nist.gov/800-63-4/sp800-63b.html)
and the [OWASP MFA guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html).
It records ITF's interim decision and does not by itself assert compliance with either publication.
