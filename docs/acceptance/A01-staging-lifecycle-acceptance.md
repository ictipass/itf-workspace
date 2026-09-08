# A01 staging lifecycle acceptance runbook

Status: In progress — provisioning, first launch and W27 navigation accepted; remaining scenarios pending  
Environment: Dedicated ITF Workspace and ITF Flow staging only

## Purpose

The happy-path launch proves connectivity. This runbook proves that access also converges safely after replay,
authorization changes, logout, duplicate events and a temporary receiver outage. Passing unit tests are necessary but
do not replace this production-like staging evidence.

## Safety prerequisites

- Deploy W28/W29 and verify both applications report Ready before starting lifecycle scenarios.
- Use a named, approved staging test identity and non-sensitive test data. Do not alter the only recoverable Workspace
  administrator or use a production identity.
- Record tester, UTC/Lagos timestamps, deployed commit hashes, expected result, actual result and a redacted Vercel
  log/database reference for each case.
- Never paste a launch assertion into chat, tickets, screenshots or source control. Copy it only after the first launch
  has consumed it, keep it in memory for the replay request, then clear the clipboard and close the private window.
- Do not weaken Vercel protection, token lifetime, audience, MFA or receiver authentication to make a test pass.

## A01-01 — Launch replay rejection

**Use case:** An attacker obtains a browser-history or diagnostic copy of a Workspace handoff that has already been
used. Reusing it must not create a second Flow session even while its two-minute signature lifetime has not elapsed.

1. Open browser developer tools on Workspace, enable **Preserve log**, and clear the Network list.
2. Launch Flow normally from the entitled Workspace catalogue and wait until Flow dashboard renders. This first request
   must finish before copying anything so the assertion is already consumed.
3. Locate the completed Flow `/workspace/launch` navigation in the Network list and copy its request URL. Do not retain
   it as evidence.
4. Within 120 seconds, open that copied URL once in a separate private window.
5. Expected result: Flow redirects to `/login?error=invalid-token`; it does not render the dashboard or create an
   authenticated Flow session. The generic error is intentional and must not reveal whether signature, timing or
   single-use validation failed.
6. Clear the clipboard and close the private window.
7. Retain only: test time, deployed commits, expected/actual redirect, tester identity, and a redacted reference showing
   one successful redemption/session rather than the assertion value.

Acceptance: **Pending live staging execution.** Repository evidence already passes the unique-redemption and concurrent
transaction regression cases.

## Remaining lifecycle cases

| Case | Practical failure being prevented | Required observation |
|---|---|---|
| A01-02 role change/mismatch | Old or forged child role outlives its approved assignment | Existing Flow session ends; launch before directory reconciliation fails; synchronized approved role launches |
| A01-03 assurance increase | A standard session survives after app/role becomes sensitive | Existing session ends and the next launch requires fresh TOTP |
| A01-04 confirmed central logout | Leaving a shared device leaves Flow usable | W28 confirmation revokes the current Workspace session and its exact Flow sessions; another device session remains |
| A01-05 entitlement revocation | Removed staff retains child access | All active Flow sessions for that entitlement end and relaunch is denied |
| A01-06 duplicate delivery | Retry applies the same security transition twice or errors | The same event is accepted idempotently and produces one effective revocation |
| A01-07 receiver outage/retry | Flow outage loses a revocation or restores access | Workspace revocation remains final; outbox enters retry and later delivers after recovery |

Execute one case at a time and restore the approved staging classification/role before starting the next. Detailed role,
assurance, revocation and outage steps must use a dedicated test identity and the deployed administrator controls; do
not manipulate application tables directly.

## Completion rule

Gate A remains **Not met** until every case has accepted evidence. Vercel Hobby's daily cron remains insufficient for
continuous retry operation; a successful authorized manual A01-07 invocation proves only finite staging recovery, not
the controlled-pilot scheduler gate.
