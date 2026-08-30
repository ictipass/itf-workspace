# W25 - Staff master-list onboarding and credential lifecycle

Status: **In progress**

Implementation commits: HR import boundary `ce680e0`; controlled initial administrator bootstrap `37feab7`; remote
transaction/input hardening `2463277`; Prisma advisory-lock correction `79aac76`

## Implemented increment

- HR master-list imports accept Workspace role `STAFF` only and reject `APP_ADMIN`, `SYSTEM_ADMIN`, unknown and
  incorrectly cased values before creating any account.
- The downloaded CSV template now contains ordinary staff examples only.
- The import page explains that privileged Workspace roles are outside the HR workflow.
- Actual imports require fresh TOTP; non-mutating dry runs retain ordinary System Administrator authorization.
- The policy is centralized in a pure server-side rule with regression coverage.
- A separate staging-only command bootstraps the first `SYSTEM_ADMIN` without using the HR spreadsheet or creating a
  child-app entitlement. It generates and emails a single-use temporary password, activates only after delivery, uses
  an advisory lock to serialize attempts, refuses existing/conflicting administrators and records audit transitions.

No database migration was required.

## Practical effect

A mistaken or altered HR spreadsheet cannot make a staff member a Workspace administrator. The file fails closed and
ICT must correct it. The exceptional first-account bootstrap is isolated from HR import and documented in
[`../initial-administrator-bootstrap.md`](../initial-administrator-bootstrap.md). Subsequent privileged-role changes
still require a separate future workflow with explicit authorization and audit.

## Visible UI change

The bulk-import introduction now states the ordinary-staff-only boundary. The downloadable example no longer shows an
`APP_ADMIN` row. An actual import attempted without fresh TOTP returns a clear verification requirement.

## Verification

- 62/62 Workspace security/regression tests pass, including two onboarding-role and nine controlled-bootstrap tests.
- TypeScript, ESLint and the 24-route production build pass.
- `git diff --check` passes apart from Git's existing LF-to-CRLF notices.

## Remaining W25 scope

- Durable welcome-email outbox, retries and operator-visible delivery state.
- Temporary-credential expiry, governed reissue and recovery under D10.
- A separately approved privileged Workspace-role grant/revoke workflow with fresh TOTP and audit evidence.
- A separately approved production initial-administrator bootstrap/change procedure; the implemented command is
  staging-only.
- Configurable official-email eligibility and child-role catalogue/approval under D15 and D22.
- Governed HR reconciliation for corrections, transfers, suspensions and exits rather than create-only import.
- Bounded import size, scalable password processing, resumable delivery and reconciliation reporting.

W25 must not be marked Implemented until these lifecycle controls and their required policy inputs are complete.
