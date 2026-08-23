# W08 - Workspace security regression test foundation

## Business outcome

Workspace now has a fast, repeatable security test entry point that can run without a database or live child
application. It protects the current authoritative-user rule and the existing version-1 launch boundary while later
Phase 1 slices add entitlement, replay and child-app revocation cases.

## Scope implemented

- Added Node's built-in test runner through the existing `tsx` development dependency; no test framework or runtime
  dependency was added.
- Extracted the pure authoritative-record decision used by `getCurrentUser`, without changing its Auth.js or Prisma
  request path.
- Covered rejection of missing/deleted, inactive and suspended users.
- Covered active-user directory attributes and immediate role promotion/demotion behavior.
- Covered version-1 launch-token issue/receive compatibility, signature tampering, malformed structure, wrong audience,
  exact expiration and missing receiver secret.
- Covered configured launch-URL normalization, injected token/fragment removal, non-HTTP rejection, token extraction and
  post-redemption URL cleanup.
- Tightened both version-1 verifiers to reject extra token segments and to reject a token at, rather than only after,
  its expiry second.
- Added `test`, `test:security` and comprehensive `verify` package scripts.

## Test boundaries

These tests deliberately do not claim that version-1 launch tokens are production SSO. W03 will replace or version
that contract after D05 and D07 are fully approved. W03-W04 must extend this suite with current entitlement,
single-use/replay, logout and revocation-delivery cases. Cross-repository Workspace/ITF Flow contract
tests are still required by Gate A.

## Verification

- `npm.cmd run test:security`: passed, 14 tests across 3 suites.
- `npx.cmd prisma validate`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, including TypeScript and all 17 routes.
- `git diff --check`: passed; only Git's existing LF-to-CRLF working-copy notices were emitted.

Implementation commit: `444287a`.

## Data, configuration and UI effects

- Database migration: none.
- New environment variables: none. Tests use an isolated test secret and restore the process environment afterward.
- Runtime UI: no visible change.
- Operational effect: maintainers can run `npm run test:security` for fast boundary checks or `npm run verify` for the
  full schema, security-test, lint and production-build gate.

## Expansion history

- W07 commit `2caeede` added 11 configuration regression tests. The suite now contains 25 tests across 6 suites.
- W02 commit `1483531` added 7 session-policy regression tests. The suite now contains 32 tests across 7 suites.

## Rollback

Revert `444287a`. No data rollback is required. Reverting also removes exact-expiry and extra-segment token rejection,
so rollback should not be used as a production workaround.
