# A01 staging lifecycle acceptance runbook

Status: **Finite staging lifecycle accepted** — A01-01 through A01-07 passed; continuous scheduling remains a separate pilot gate
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

Acceptance: **Passed on 2026-09-08.** Reusing the consumed launch request in a separate unauthenticated browser context
reached Flow's generic invalid-token response and did not create an authenticated Flow session. No assertion or token
value was retained as evidence. Repository evidence also passes the unique-redemption and concurrent-transaction
regression cases.

## Ordinary-staff provisioning and launch

Acceptance: **Passed on 2026-09-12.** Dedicated ordinary staging users were created through the HR CSV path, received
welcome email, replaced temporary passwords and signed into Workspace. After approved `OFFICER = STANDARD`
classification and directory synchronization, their catalogue controls enabled and Workspace-to-Flow launch
completed. No personal identity or authentication material is retained in this evidence.

## Remaining lifecycle cases

| Case | Practical failure being prevented | Required observation |
|---|---|---|
| A01-02 role change/mismatch — accepted 2026-09-14 | Old or forged child role outlives its approved assignment | Existing Flow session ends; launch before directory reconciliation fails; synchronized approved role launches |
| A01-03 assurance increase — accepted 2026-09-14 | A standard session survives after app/role becomes sensitive | Existing session ends and the next launch requires fresh TOTP |
| A01-04 confirmed central logout — accepted 2026-09-08 | Leaving a shared device leaves Flow usable | W28 confirmation revoked the current Workspace session and its exact Flow session; the separately authenticated Workspace device session remained available |
| A01-05 entitlement revocation — accepted 2026-09-17 | Removed staff retains child access | All active Flow sessions for that entitlement end and relaunch is denied |
| A01-06 duplicate delivery | Retry applies the same security transition twice or errors | The same event is accepted idempotently and produces one effective revocation |
| A01-07 receiver outage/retry | Flow outage loses a revocation or restores access | Workspace revocation remains final; outbox enters retry and later delivers after recovery |

Execute one case at a time and restore the approved staging classification/role before starting the next. Detailed role,
assurance, revocation and outage steps must use a dedicated test identity and the deployed administrator controls; do
not manipulate application tables directly.

## What ITF must provide before the remaining exercise

The tester does not need to provide a password, TOTP secret, integration secret, launch assertion or database
credential in chat or in the evidence pack. ITF must provide only the following decisions and operating window:

- **A01-02:** approve one temporary destination Flow role and its `STANDARD` or `SENSITIVE` classification. It must be
  a real Flow role code. `OFFICER` remains the approved starting/restoration role; engineering must not select the
  destination role on ITF's behalf.
- **A01-03:** authorize a time-bounded staging-only change of `OFFICER` from `STANDARD` to `SENSITIVE`, followed by
  immediate restoration to `STANDARD`. The change affects every staging user assigned `OFFICER`, so name a maintenance
  window with no unrelated staging test in progress.
- **A01-05:** authorize use of the dedicated ordinary staging identity whose access may be revoked and restored. No
  new policy classification is required.
- **A01-06 and A01-07:** authorize a staging maintenance window and configure the chosen ordinary test-user ID and
  matching temporary expiry in both apps. W42/Flow S23E implement the diagnostic. Do not improvise with database edits or secrets pasted into a shell
  command, browser, chat or ticket.

Record the approving authority and approval reference with the test evidence. The approval may identify the dedicated
test account internally, but this repository should retain only a non-personal test-identity reference.

## Common pre-test checklist

- [ ] Confirm the browser address is the dedicated Workspace staging domain and Flow resolves to the dedicated Flow
  staging project; neither app points to production.
- [ ] Record the deployed Workspace and Flow commit hashes.
- [ ] Confirm both readiness endpoints report ready and the ordinary test identity can launch as `OFFICER`.
- [ ] Confirm `OFFICER = STANDARD` before starting and that the test identity is not the only recoverable administrator.
- [ ] Open one browser profile for the ordinary test user and a separate profile for the `SYSTEM_ADMIN`.
- [ ] Open Vercel runtime logs for both projects, but enable no request-body or secret logging.
- [ ] Record start time in WAT and UTC, tester, case ID and the approved change reference.
- [ ] Run only one case, complete its restoration checklist, and then start the next case.

## A01-02 — Role change and mismatch

Purpose: prove that an old Flow role cannot survive a Workspace role change and that Flow refuses the new assertion
until its own directory has reconciled that exact role.

Prerequisite: ITF has approved the temporary destination Flow role and assurance classification. The role must first
exist under **Administration → Apps → ITF Flow → Edit → Child-app role assurance**.

1. As the ordinary user, launch Flow as `OFFICER` and leave the Flow page open.
2. As `SYSTEM_ADMIN`, open **Administration → App Access**. In **Grant App Access**, select the same user and ITF Flow's
   approved destination role, then submit. This updates the existing entitlement; it does not create a second one.
3. Refresh or navigate in the user's already-open Flow session.
4. Expected: the old Flow session no longer opens protected content and Flow requires entry through Workspace again.
5. Before running directory synchronization, launch Flow again from the user's Workspace catalogue.
6. Expected: Flow rejects the launch with its generic invalid-token/login result because Workspace asserts the new
   role while Flow still holds `OFFICER`. A Flow dashboard must not be created.
7. As `SYSTEM_ADMIN`, open **Administration → Bulk Import Users** and select **Synchronize entitled staff to ITF Flow**.
8. Launch Flow again from the user's catalogue.
9. Expected: launch succeeds and Flow applies the approved destination role, not `OFFICER`.
10. Restore the Workspace entitlement to `OFFICER`, run directory synchronization again, and prove a final launch
    succeeds as `OFFICER`.

Pass only when all four observations are recorded: old session ended, pre-sync launch rejected, post-sync new role
accepted, and restoration to `OFFICER` accepted.

Acceptance: **Passed on 2026-09-14.** `SYSTEM_ADMIN` approved temporary `UNIT_HEAD = STANDARD`. ITF confirmed all four
observations: the old session ended, the pre-sync mismatch failed, the synchronized `UNIT_HEAD` launch succeeded, and
the final `OFFICER = STANDARD` restoration and launch succeeded.

## A01-03 — Standard-to-sensitive assurance increase

Purpose: prove that changing policy from password-only to TOTP-protected access terminates the lower-assurance Flow
session and that a new sensitive launch cannot bypass TOTP.

Prerequisite: ITF has approved the staging-only maintenance window and temporary `OFFICER = SENSITIVE` change.

1. Confirm the test user's entitlement and synchronized Flow role are `OFFICER`, and launch Flow while
   `OFFICER = STANDARD`.
2. As `SYSTEM_ADMIN`, open **Administration → Apps → ITF Flow → Edit → Child-app role assurance**.
3. Change `OFFICER` from `STANDARD` to `SENSITIVE` and select **Update**.
4. Refresh or navigate in the user's existing Flow session.
5. Expected: the existing Flow session no longer opens protected content.
6. From Workspace, try to launch Flow again. If the user has not enrolled TOTP, Workspace must require enrollment; if
   already enrolled, it must require a current code. Do not record the QR setup key or six-digit code.
7. Expected: Flow does not launch before successful TOTP. After successful verification, it launches with TOTP present
   in the approved authentication assurance.
8. Restore `OFFICER` to `STANDARD`, sign out of Flow, and confirm the ordinary Workspace catalogue can launch Flow
   under the approved baseline policy.

Pass only when the lower-assurance session ends, pre-TOTP launch is denied, post-TOTP launch succeeds, and the policy
is restored. Because this temporarily affects every staging `OFFICER`, do not run it during unrelated demonstrations.

Acceptance: **Passed on 2026-09-14.** ITF confirmed the existing standard Flow session ended, launch was blocked until
TOTP, post-TOTP launch succeeded, and `OFFICER = STANDARD` was restored successfully. An expired ten-minute
administrator step-up also exposed an unhandled `FRESH_MFA_REQUIRED` page error; W37 corrected role-policy recovery
without weakening D05. Follow-up commit `ec760ee` applies the same safe reauthentication pattern to entitlement
revocation and requires a staging redeployment before A01-05 continues.

## A01-05 — Entitlement revocation

Purpose: prove that removing the Workspace entitlement ends every Flow session for the user and that neither a stale
Flow cookie nor a direct launch attempt restores access.

1. Launch Flow for the dedicated user in two separate browser profiles so two active Flow sessions exist.
2. As `SYSTEM_ADMIN`, open **Administration → App Access** and select **Revoke** for that user's active ITF Flow access.
3. Refresh or navigate to protected pages in both Flow browser profiles.
4. Expected: both sessions are rejected; entitlement revocation is user-wide rather than limited to one browser.
5. Refresh the user's Workspace catalogue.
6. Expected: ITF Flow remains visible in the complete registry but its launch control is disabled because the user is
   no longer entitled.
7. Attempting the old Flow URL directly must not restore a staff session.
8. Restore access by granting `OFFICER`, run **Synchronize entitled staff to ITF Flow**, and confirm a new Workspace
   launch succeeds.

Pass only when both sessions end, relaunch is denied while revoked, and controlled regrant plus synchronization is
required for recovery.

Acceptance: **Passed on 2026-09-17.** ITF confirmed that both separately launched browser-profile sessions rejected
protected Flow pages after Workspace revocation. Workspace retained Flow but disabled launch; OFFICER regrant,
directory synchronization and a new launch succeeded. This confirmation does not separately attest an expired-TOTP
revocation submission; that negative-path recovery check remains independently verifiable.

## A01-06 — Duplicate delivery

Purpose: prove that retrying the exact same security event does not fail and does not apply the state transition twice.
The same `eventId` and identical payload must be delivered twice; creating two different revocation events is not this
test.

W42/Flow S23E implement the narrowly scoped diagnostic at
`/dashboard/admin/integrations/acceptance`. Follow the
[exact deployment/operator procedure](A01-staging-diagnostic-operations.md). It:

- refuses to run against a non-staging environment;
- creates or selects one test-user entitlement event without accepting arbitrary URLs or payloads;
- sends the same server-generated event body and `eventId` twice through the authenticated Flow receiver;
- reads the receiver outcomes without displaying the bearer credential or request body;
- reports first delivery as `accepted: true, duplicate: false` and the second as
  `accepted: true, duplicate: true`;
- provides a redacted event/correlation reference and verifies only one effective session/identity revocation; and
- requires explicit confirmation and documents how to restore the test user.

The operator checklist is:

- [ ] Start with one active test entitlement and Flow session.
- [x] Run the diagnostic once for A01-06; do not manually repeat or modify its payload.
- [x] Confirm both receiver calls are accepted and the second is marked duplicate.
- [x] Confirm the Flow session is revoked once and no duplicate durable side effect or server error appears.
- [x] Regrant/synchronize the test identity if the diagnostic used entitlement revocation, then prove launch succeeds.

Acceptance: **Passed, reported by the super administrator on 2026-09-21.**

## A01-07 — Receiver outage and retry recovery

Purpose: prove that a temporary Flow outage cannot undo a Workspace revocation, that failed delivery remains durable,
and that the same event is delivered after recovery.

W42/Flow S23E isolate the recorded test event, show bounded evidence and simulate one authenticated HTTP 503 before
receiver side effects. Follow the [exact configuration and retry steps](A01-staging-diagnostic-operations.md). It:

- refuses non-staging targets and requires explicit confirmation of the dedicated test identity;
- preflights that no unrelated due integration event will be processed;
- induces a bounded Flow receiver failure without weakening receiver authentication or changing production settings;
- identifies the generated outbox event and shows only redacted status, attempts, next retry time and correlation data;
- verifies the Workspace entitlement is already revoked while delivery is `RETRY`;
- retries without the one-request failure header after the event becomes due, and follows that one event to
  `DELIVERED`; and
- never exposes `WORKSPACE_INTEROP_SECRET`, `WORKSPACE_OUTBOX_WORKER_SECRET` or a database credential.

The operator checklist is:

- [x] Start with an active test entitlement and Flow session; record the approved maintenance window.
- [x] Select A01-07 on **Staging integration acceptance** and explicitly confirm diagnostic revocation there.
- [x] Confirm Workspace immediately disables launch even though Flow event delivery failed.
- [x] Confirm the event is durable in `RETRY`, with a bounded next-attempt time; do not edit the outbox row.
- [x] Check/retry the recorded event without a failure header after its displayed due time.
- [x] Confirm the same event reaches `DELIVERED`, the Flow session ends and direct/Workspace relaunch remains denied.
- [x] Regrant `OFFICER`, synchronize the directory and prove normal launch recovery.

Acceptance: **Passed, reported by the super administrator on 2026-09-21.**

A manual successful retry on Vercel Hobby closes the finite A01-07 staging case only. Its once-per-day cron cannot
meet continuous revocation operations; a production-capable scheduler remains a separate Gate B/production blocker.

## Evidence checklist for every case

- [ ] Case ID, expected result, actual result and pass/fail decision.
- [ ] Tester and approving authority reference; no personal authentication data.
- [ ] WAT and UTC start/end times and both deployed commit hashes.
- [ ] Redacted Workspace audit reference and Flow/outbox correlation or event reference where applicable.
- [ ] Screenshots contain no query tokens, secrets, TOTP setup data, email addresses or other personal data.
- [ ] Restoration completed and verified: `OFFICER = STANDARD`, intended entitlement active and directory synchronized.
- [ ] Any unexpected result is recorded as failed; do not weaken a control or repeat mutations until engineering has
  reviewed the logs.

## Completion rule

Gate A is **met for integrated staging**: A01-01 through A01-07 have accepted results. Vercel Hobby's daily cron remains
insufficient for continuous retry operation; the successful authorized manual A01-07 invocation proves finite staging
recovery, not the controlled-pilot scheduler gate.
