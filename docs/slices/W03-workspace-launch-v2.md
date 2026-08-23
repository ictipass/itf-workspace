# W03 — Workspace launch v2 issuer aligned with ITF Flow

Status: **Implemented**

Implementation date: 2026-08-23

Workspace commits: `9cbec46`, validation hardening `42c4f3b`, onboarding correction `4c88f89`

ITF Flow commit: `f0696bc`

## Outcome

W03 replaces the version-1 shared HMAC launch handoff with an audience-bound RS256 JWS and aligns the first receiving
application, ITF Flow, to that same versioned contract. It implements approved D05-D07 without treating the handoff as
full SSO or claiming that existing child sessions are centrally revoked.

## Implemented controls

- A configurable Workspace issuer with a vendor-neutral signing interface, 3072-bit ephemeral development keys,
  development/staging software-key support, public JWKS and a fail-closed production KMS/HSM gate.
- A 120-second assertion lifetime, 30-second clock-skew allowance, stable per-app audience, unique `jti`, immutable
  Workspace subject and explicit entitlement/authentication claims.
- Explicit application and child-role `STANDARD`/`SENSITIVE` classification. Assignments can reference only active,
  classified roles; the most restrictive app/role/Workspace classification wins.
- TOTP enrollment and step-up with AES-256-GCM encrypted secrets, a ten-minute enrollment challenge, one-code replay
  prevention, ten-minute freshness and audit events. Email remains recovery/notification only.
- Server-side fresh-TOTP enforcement for app registration, app/role classification changes, access grant/revocation,
  and sensitive launches. Privileged Workspace accounts must complete TOTP after each password login.
- ITF Flow RSA/JWKS verification, five-minute public-key cache, exact issuer/audience/slug and role checks, sensitive
  TOTP validation, database-unique assertion redemption, and local session creation.
- Removal of the obsolete Workspace HMAC issuer/receiver and production shared-launch-secret requirement.

## Data migration

`20260823120000_add_launch_v2_assurance` adds:

- application launch audience and assurance classification;
- first-class per-application role assurance records;
- non-null normalized role codes on direct access records;
- encrypted/pending TOTP state and last-used counter on users;
- MFA time and authentication methods on Workspace sessions;
- MFA and role-policy audit action values.

Existing app audiences were backfilled from their slugs, blank access roles became `USER`, existing role values were
normalized to uppercase, and corresponding standard role policies were created. The migration was applied successfully
to local `itf_workspace_db`; the database remains unseeded.

Follow-up migration `20260823170000_align_app_role_policy_updated_at` removes the temporary database default used when
creating `AppRolePolicy.updatedAt`, aligning the live database with Prisma's `@updatedAt` ownership. This resolves the
schema difference that caused `prisma migrate dev` to request an unnecessary migration name after W03.

## First-login correction

Commit `4c88f89` restores the required authentication order for privileged temporary accounts: verify the supplied
temporary password, replace it, revoke all sessions, sign in with the new password, and only then enroll/verify TOTP.
The pre-MFA exception is restricted to a valid password-authenticated session whose authoritative user record still
requires temporary-password replacement. It does not grant dashboard or administrative access before MFA.

## Visible UI change

- System administrators can classify an application and its roles as standard or sensitive and configure the stable
  launch audience.
- Access grants use a classified application-role selection instead of free text.
- The app catalogue displays effective assurance and disables launch when an existing role has no active policy.
- New TOTP enrollment and verification screens appear when a privileged account or sensitive launch requires them.

## Verification evidence

- Workspace Prisma format, generate, validate/migration deployment: passed.
- Workspace TypeScript, ESLint and production build: passed.
- Workspace security regressions: 32/32 passed across eight suites.
- ITF Flow TypeScript, ESLint and production build: passed.
- ITF Flow security regressions: 8/8 passed, including four launch-v2 contract tests.
- Both repositories passed `git diff --check` for the committed implementation.

## Operational and rollback notes

- This checkout now has an ignored, randomly generated 32-byte local `WORKSPACE_MFA_ENCRYPTION_KEY_BASE64`. Every new
  environment must receive its own value outside source control and back it up through the approved secret process.
- Production assertion signing is deliberately blocked until ITF selects the KMS/HSM provider and its adapter is
  implemented. Ephemeral or exportable software keys must not be used in production.
- A rollback to the former shared-secret receiver is not approved. Application rollback requires stopping new launches,
  restoring compatible application binaries/schema through an approved change, and preserving audit/redemption data.
- W03 does not terminate an ITF Flow session when the Workspace session or entitlement is revoked; W04 supplies that
  missing control.

## Readiness

Gate A is not yet met. The signed launch issuer and ITF Flow receiver now agree and cross-repository contract tests
pass, but W04 central logout/entitlement revocation, revocation regression coverage, and environment-separated staging
configuration remain. Workspace is therefore ready for continued ITF Flow integration development, but not yet for
the formal Gate A reassessment or controlled pilot.

Next best implementable slice: **W04 — immediate central logout and entitlement-revocation delivery to ITF Flow**.
