# W02 - Revocable Workspace sessions and session inventory

## Business outcome

Workspace now treats its encrypted Auth.js cookie as a reference to a server-authoritative database session. A valid
cookie alone no longer grants access: the user and session must both remain active, within the approved idle and
absolute lifetimes, and not revoked. Users and system administrators can inspect and immediately terminate sessions.

Implementation commit: `1483531`.

## Approved policy implemented

- Staff idle expiry: 20 minutes; `APP_ADMIN` and `SYSTEM_ADMIN`: 10 minutes.
- Warning: two minutes before idle expiry.
- Absolute expiry: three hours for every role, with no trusted-device extension.
- Concurrent limit: two active Workspace sessions per user.
- Recovery: valid credentials at the limit create no third session. A short-lived restricted screen lets the user end
  one or all existing sessions before a replacement session is issued.
- Workspace activity: deliberate click, key or touch activity in Workspace is reported through an authenticated
  request. Passive polling and child-application activity do not extend the session.
- Password change and account deactivation revoke active sessions.
- Inventory stores identifiers and timestamps only; it does not retain IP, user-agent or location data.

## Implementation and security boundaries

- `WorkspaceSession` stores authentication, last-activity, idle-expiry, absolute-expiry and revocation state.
- `WorkspaceSessionRecoveryGrant` stores only a SHA-256 hash of a cryptographically random 256-bit, single-use grant.
  The grant is delivered in a `Secure` production, `HttpOnly`, `SameSite=Strict`, path-restricted cookie.
- Session creation and limit recovery serialize on the PostgreSQL user row, preventing simultaneous requests from
  exceeding the configured cap.
- Every `getCurrentUser`/`requireCurrentUser` authorization path now validates the database session and current user.
- Current database role controls the idle policy; promotion to a privileged role cannot retain a staff timeout.
- Recovery tokens do not create a normal session until an existing session is atomically revoked.
- Explicit revocation and recovery are audit logged. Existing login/logout and user-update audit events remain.
- The client warning and timers improve user experience only; the server enforces expiry and revocation.

Central child-app logout and entitlement revocation are not claimed by this slice. They remain W04. MFA/step-up and
asymmetric launch signing remain governed by open D05/D07 and block W03.

## Configuration contract

| Variable | Approved default | Valid range |
|---|---:|---:|
| `WORKSPACE_STAFF_IDLE_TIMEOUT_SECONDS` | 1200 | 300-7200 |
| `WORKSPACE_PRIVILEGED_IDLE_TIMEOUT_SECONDS` | 600 | 300-3600 |
| `WORKSPACE_SESSION_WARNING_SECONDS` | 120 | 30-600 and shorter than both idle limits |
| `WORKSPACE_ABSOLUTE_TIMEOUT_SECONDS` | 10800 | 1800-86400 and longer than both idle limits |
| `WORKSPACE_MAX_CONCURRENT_SESSIONS` | 2 | 1-10 |
| `WORKSPACE_SESSION_RECOVERY_TTL_SECONDS` | 300 | 60-900 |

These settings are configurable for approved future policy changes and validated at startup. Changing them in a
deployment does not itself constitute policy approval.

## Visible UI changes

- A non-dismissible two-minute session warning appears before idle expiry and offers an explicit Continue action.
- The dashboard navigation includes **My Sessions**, with current/recent state and self-service termination.
- A valid sign-in that reaches the two-session cap opens a restricted recovery screen.
- System administrators have a **Sessions** action for each directory user and may end one or all active sessions.
- Login explains session expiry and expired recovery grants.

No device, browser or location label is shown because W02 deliberately does not collect that information.

## Migration and deployment

- Migration: `20260823090000_add_revocable_workspace_sessions`.
- The migration adds two tables, a revocation-reason enum and `SESSION_TERMINATED` audit action; it does not rewrite or
  delete existing user/application data.
- All pre-W02 browser JWTs lack a database session identifier and therefore require one deliberate sign-in after
  deployment. Communicate this before rollout.
- Run `prisma migrate deploy` before starting W02 code. Rolling out code first fails closed but prevents protected use.
- The configured local database `itf_workspace_db` did not exist, so it was not created or altered. The full migration
  chain was instead applied to a uniquely named disposable PostgreSQL database, both W02 tables were verified, and the
  disposable database was removed.

## Verification

- TypeScript (`tsc --noEmit`): passed.
- Prisma schema validation and client generation: passed.
- Disposable PostgreSQL full-chain migration and W02 table verification: passed.
- Security regression suite: 32/32 tests passed across seven suites. Seven W02 tests cover approved defaults,
  configurable overrides, invalid policy relationships, role-specific idle timing, exact expiry boundaries,
  revocation precedence and the absolute-lifetime cap.
- Repository ESLint: passed.
- Next.js production build: passed; all 20 routes compiled, including activity, recovery and session inventory routes.
- `git diff --check`: passed, with only existing Git LF/CRLF notices.

## Rollback

Revert `1483531` and redeploy the prior application. The additive tables and enum values may safely remain unused;
dropping them would destroy session/audit evidence and requires a separately approved data-retention decision. A
rollback or forward deployment invalidates browser sessions across the model boundary, so users must sign in again.

## Readiness result

W02 is **Implemented**. No child-app readiness gate is yet satisfied. Gate A still requires W03, W04, full D05/D07
approval, expanded entitlement/launch/replay/revocation and cross-repository contract tests, and environment-separated
credentials. Workspace is **not yet ready for ITF Flow integration reassessment**.
