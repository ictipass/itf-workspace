# W08 - Workspace security regression test foundation

## Business outcome

Workspace now has a fast, repeatable security test entry point that can run without a database or live child
application. It protects authoritative-user, configuration, session, launch-v2, assurance, TOTP and versioned central
child-app provisioning/revocation boundaries.

## Scope implemented

- Added Node's built-in test runner through the existing `tsx` development dependency; no test framework or runtime
  dependency was added.
- Extracted the pure authoritative-record decision used by `getCurrentUser`, without changing its Auth.js or Prisma
  request path.
- Covered rejection of missing/deleted, inactive and suspended users.
- Covered active-user directory attributes and immediate role promotion/demotion behavior.
- W03 replaced the original version-1 cases with RS256 signing, signature tampering, issuer/audience binding, timing,
  sensitive-assurance and TOTP controls; ITF Flow carries matching receiver contract fixtures.
- Covered configured launch-URL normalization, injected token/fragment removal, non-HTTP rejection, token extraction and
  post-redemption URL cleanup.
- Removed the obsolete shared-secret verifier after the asymmetric contract and receiving app agreed.
- Added `test`, `test:security` and comprehensive `verify` package scripts.

## Test boundaries

These tests do not claim that the launch handoff is production OIDC. W03 covers current entitlement, assurance and the
signed handoff in both repositories. W04 adds matching producer/receiver fixtures, target-app validation and bounded
retry-policy coverage. Live outage and duplicate-delivery behavior remains a staging acceptance boundary.

## Verification

- `npm.cmd run test:security`: passed, 40 tests across 8 suites.
- ITF Flow `npm.cmd run test:security`: passed, 21 tests.
- `npx.cmd prisma validate`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, including TypeScript and all 24 Workspace routes; ITF Flow build also passed.
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
- W03 commits `9cbec46` and `42c4f3b` removed obsolete v1 cases and added launch-v2/assurance/TOTP coverage. At that
  point, the Workspace suite contained 31 tests across eight suites. ITF Flow commit `f0696bc` passes eight security tests,
  including four receiver contract cases.
- W03 correction `4c88f89` adds the privileged first-login credential-order regression. At that point, the Workspace
  suite contained 32 tests across eight suites.
- W03 QR enrollment `ca8b88b` adds local TOTP QR rendering and rejects non-TOTP QR input. The current Workspace suite
  contained 33 tests across eight suites.
- W04 Workspace commits `c8d3605`, `6427f98` and ITF Flow commits `30ace13`, `7a3a849` add the versioned
  central-logout/entitlement contract, fail-closed event scope, receiver selectors, configuration and retry-boundary
  cases. The suites now contain 37 Workspace tests across eight suites and 11 ITF Flow security tests.
- A01 Workspace commit `1a08a5b` and ITF Flow commit `02b433d` add upstream session-deadline, versioned directory,
  immutable identity, payload-bound idempotency and role/status/assurance revocation cases. The suites now contain 40
  Workspace tests across eight suites and 21 ITF Flow security tests.

## Rollback

The initial test harness can be removed by reverting `444287a`, but later slice regressions must be reverted with their
own implementations. W04 data/delivery rollback is governed by its slice document; dropping retained outbox evidence is
not a safe application rollback.
