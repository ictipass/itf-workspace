# Controlled A01-06/A01-07 staging diagnostic

Status: W42 / Flow S23E implemented; **live acceptance pending**.
Purpose: safely prove duplicate-event idempotence and finite outage/retry recovery using one approved ordinary test
identity. This is not a production troubleshooting tool, general event replay facility or continuous scheduler.

## Safety and deployment configuration

Use an approved staging maintenance window with no unrelated lifecycle operation or worker invocation. Record the
approver, maintenance reference, tester, UTC/WAT times and both deployed commits. Use a dedicated ordinary `STAFF`
account, never the administrator or a production identity.

Deploy both repositories before enabling a test. No schema migration or new secret is required. Existing authenticated
Flow receiver credentials are reused server-side; the browser receives only safe references and aggregate counts.

Find the test account's immutable Workspace ID from its **Users → Sessions** link
(`/dashboard/admin/users/<ID>/sessions`). Do not use its email or Flow-local ID.

Configure the following **same three non-secret values in both staging deployments**:

| Variable | Value |
|---|---|
| `WORKSPACE_STAGING_ACCEPTANCE_ENABLED` | `true` during the approved window only |
| `WORKSPACE_STAGING_ACCEPTANCE_USER_ID` | Dedicated ordinary test account's immutable Workspace ID |
| `WORKSPACE_STAGING_ACCEPTANCE_EXPIRES_AT` | Same UTC ISO timestamp ending in `Z`; future and no more than 24 hours away |

Generate a two-hour expiry in **Command Prompt**:

```cmd
node -e "console.log(new Date(Date.now()+2*60*60*1000).toISOString())"
```

Keep existing Workspace `WORKSPACE_DEPLOYMENT_STAGE=staging` in its Vercel Preview deployment. The Workspace
diagnostic rejects Vercel Production. In the dedicated **itf-flow-staging** project set
`ITF_FLOW_DEPLOYMENT_STAGE=staging`. This project may use Vercel's Production deployment slot because ITF confirmed
the project is exclusively staging; `NODE_ENV=production` is not a staging/production security-policy selector.
Never enable these flags in the real production project. Leave defaults `false` there.

Redeploy Flow and Workspace. A wrong stage, pin, expired window or unavailable authenticated Flow observation prevents
starting. Expiration disables the diagnostic; it does not disable the entire app.

## Common preconditions

1. Flow registry entry is `STAGING`, active and `STANDARD`; its origin matches the configured session-event receiver.
2. `OFFICER = STANDARD` is active and approved, and the dedicated ordinary account has that active entitlement.
3. [Synchronize Flow's directory](../runbooks/flow-directory-synchronization.md), then launch Flow for that account.
   Keep at least one live Flow session open in a separate browser profile.
4. Resolve unrelated due or processing Flow outbox events through approved operations. Do not edit the queue directly.
5. As `SYSTEM_ADMIN`, open `/dashboard/admin/integrations/acceptance` (also linked from **Admin Help → Flow**).
   Complete fresh TOTP when requested. The page shows the pinned ID, never allows an arbitrary user or endpoint.
6. Record the maintenance approval reference and explicitly confirm that the test entitlement will be revoked.

## A01-06 — Exact duplicate delivery

1. Select **A01-06**, supply the approved reference, confirm revocation and submit once.
2. The server atomically revokes Workspace access and creates one event with a durable start audit. It delivers the
   same event ID and server-generated body twice through the authenticated Flow receiver.
3. Require **Passed** and inspect: first acknowledgement `duplicate=false`, second `duplicate=true`, outbox
   `DELIVERED`, Workspace entitlement revoked, one Flow event, zero live Flow sessions and the expected revoked-session
   count. This count includes expired-but-not-yet-revoked records because the real receiver revokes every unrevoked
   session. The duplicate acknowledgement must report zero newly matched sessions.
4. In the ordinary user's browser, confirm protected Flow navigation is rejected and Workspace shows Flow disabled.
5. Retain the event reference and redacted evidence checklist from the [lifecycle runbook](A01-staging-lifecycle-acceptance.md).
6. Only after delivery is confirmed, regrant `OFFICER`, synchronize and verify a **new** Workspace-to-Flow launch.

## A01-07 — Authenticated one-request outage and durable retry

1. Restore the baseline and a live Flow session before starting a separate case.
2. Select **A01-07**, supply the reference, confirm revocation and submit once.
3. The initial authenticated request asks Flow to return HTTP 503 **before database side effects**. This is a bounded
   receiver-failure simulation, not a project-wide outage or receiver-authentication bypass.
4. Require recorded receiver HTTP `503`, outbox `RETRY`, attempt count `1`, a future due timestamp and Workspace entitlement still revoked. The
   initial Flow observation must show no receipt of that event and an unchanged active identity/live session.
   Workspace launch must already be disabled. This temporary child-state delay is what the retry test measures.
5. Do not perform unrelated sensitive operations or regrant access. After the displayed due time, enter/retain this
   event UUID in **Check / retry recorded A01-07**, confirm the action and submit.
6. The server claims **only that recorded event** with the existing lease/retry worker. It omits the failure header.
   If still not due, check again after the timestamp; do not change queue timestamps or retry settings to force a pass.
7. Require **Passed**, the **same** event UUID now `DELIVERED`, entitlement still revoked, Flow inactive, one effective
   Flow event and zero live sessions. Confirm browser rejection and the disabled Workspace launch.
8. Record evidence, then regrant `OFFICER`, synchronize and prove normal launch recovery.

An authorized normal worker may deliver the event before the operator returns; the check then reads its delivered
state without resending. The page can resume only the current administrator's recorded A01-07 run, using the same pin.
This manual finite test does **not** solve Vercel Hobby's once-per-day scheduling limitation.

## Uncertain result, expiry and cleanup

- After a committed revocation, failures explicitly state that access was revoked and supply an event reference.
  Do not assume the action rolled back or start another case. Inspect the audit/outbox reference.
- A network failure or different receiver error is not the requested 503 evidence. Resume can resolve the recorded
  event, but cannot report the outage case passed without the durable initial-503 audit.
- If a pending diagnostic event outlives the window, renew a matching, approved short window in both apps before
  retrying. Reserved diagnostic events are rejected outside the enabled window. Do not disable the flags while such
  an event remains unresolved; escalate `DEAD_LETTER` or inconsistent evidence rather than manipulating the database.
- A premature regrant is rejected by the resume action. Escalate reconciliation; replaying an older revocation over a
  restored entitlement is not a valid acceptance result.
- No action automatically regrants, changes policy or restores access. Operators must use normal approved controls.
- Once both events are delivered and the test account is restored, set enable to `false`, remove the temporary pin
  and expiry in both staging environments, and redeploy. Retain redacted audit/evidence; do not delete events.
- Finish pending diagnostic events before reverting either app's code. A code rollback does not undo revocation or
  remove queued events. No data rollback is needed or authorized by this slice.

Report case ID, pass/fail, timestamps, both deployed commits and redacted event/audit references. Never report bearer
credentials, launch URLs, QR codes, TOTP secrets or personal identity details.
