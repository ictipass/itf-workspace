# W01 — Authoritative current-user validation

## Business outcome

Workspace no longer authorizes a protected operation solely from role, status or organization claims captured when a
JWT was created. Deactivation, suspension, role changes and directory changes are resolved from the current Workspace
user record before server-side authorization proceeds.

## Scope

- Resolve the authenticated JWT subject to the current database user.
- Reject missing, deleted, inactive and suspended users.
- Return the latest Workspace role and organizational identifiers.
- Make the dashboard shell, administrator navigation, logout audit and existing `requireCurrentUser` consumers use
  the authoritative result.

## Out of scope

- Replacing JWT sessions with revocable database sessions; that is W02.
- Choosing idle/absolute session durations or concurrent-session policy.
- MFA, login throttling, account recovery or enterprise IdP integration.
- Central child-app session revocation; that is W04.

## Authorization invariant

Possession of a validly signed browser JWT is necessary but not sufficient. A protected operation requires a current
database user whose status is `ACTIVE`; authorization uses that record's current `workspaceRole` and attributes.

## Acceptance criteria

- A deleted, inactive or suspended user cannot obtain a current Workspace user.
- A demoted administrator immediately loses server-side administrator authorization on the next request.
- A promoted user receives the current role without signing out and back in.
- App launch evaluates the current central identity and the current active app entitlement.
- Dashboard administrator navigation uses the current role rather than the JWT role.
- Existing active users retain normal access.
- Lint and production build pass after dependencies are installed.

## Implementation evidence

- `lib/auth/current-user.ts` is a server-only authorization helper that resolves the JWT subject through Prisma,
  requires `UserStatus.ACTIVE` and memoizes duplicate lookups during a React render pass.
- `lib/auth/authoritative-user.ts` isolates the authoritative-record decision so the exact production rule can be
  tested without substituting a test database for the request path.
- `app/dashboard/layout.tsx` uses the authoritative helper for shell authorization and logout audit attribution.
- Implementation commit: `16dcefc`; regression evidence commit: `444287a`.

## Verification status

- Source review: passed.
- Targeted ESLint for the two changed application files: passed.
- Next.js production build and TypeScript validation: passed.
- Repository-wide ESLint: passed after W00 resolved the four pre-existing baseline errors.
- `git diff --check`: passed.
- W08 security regression tests: passed for missing/deleted, inactive and suspended records; active-user attribute
  mapping; and current-role promotion/demotion behavior.

The slice is **Implemented**. No database migration or new configuration is required.

## Rollback

Revert the two application-file changes. No data rollback is required. Reverting restores stale JWT claim trust and
must not be used as a production workaround.
