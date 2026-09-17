# ITF Workspace troubleshooting guide

## Safety first

Never paste passwords, TOTP values, QR/setup keys, API secrets, private keys, complete database URLs or launch-token
URLs into tickets, chat or screenshots. Use timestamps, public routes, correlation IDs and redacted log references.

## Authentication

| Symptom | Likely cause | Safe action |
|---|---|---|
| Login page returns HTTP 500 | Invalid/missing deployed configuration or database failure | Check Vercel runtime log and run the stage configuration check; do not weaken validation |
| Temporary password accepted but ordinary pages redirect | Password replacement is still required | Complete `/change-password`; preserve the user's other work |
| `MFA_REQUIRED` during password replacement | Deployment lacks the correction that permits temporary-password replacement before privileged enrollment | Confirm deployed commits and redeploy; do not bypass MFA in the database |
| TOTP code invalid after QR scan | Device clock drift, stale enrollment page or wrong account entry | Enable automatic device time, rescan a newly rendered QR and use the current six-digit code |
| Concurrent-session limit | Two Workspace sessions are active | Use the restricted recovery screen to terminate an old session |
| Session expires while using Flow | Child activity does not extend Workspace | Sign in again through Workspace; this is approved behavior |

## Staff onboarding

| Symptom | Likely cause | Safe action |
|---|---|---|
| CSV validation reports duplicate staff/email | User already exists or file contains duplicates | Remove/correct the row; importer is create-only |
| Reference code not found | Code is absent/inactive or file is stale | Correct Organization Setup and download fresh codes |
| Hierarchy mismatch | Department/division/unit belongs to another parent | Use current reference codes and correct the row |
| Import succeeded but welcome email is absent | Post-commit delivery issue | Verify user/audit state and escalate; do not re-import or invent a credential |
| `Role classification required` | Active entitlement has no matching active role policy | Classify exact role in Manage Apps, synchronize and refresh |
| Directory sync lists blocking roles | One or more active entitlements are unclassified | Obtain approvals and configure every listed role before retrying |
| Flow launch rejects after import | Directory was not synchronized, role differs, receiver config is wrong or token validation failed | Sync, confirm exact role/URLs, then use redacted correlated logs |

## Application launch and integration

| Symptom | Likely cause | Safe action |
|---|---|---|
| `Access not assigned` | No active `AppAccess` | Use approved App Access grant with fresh TOTP |
| `Role classification required` | Role policy missing/inactive | Add the exact approved role classification |
| Sensitive launch redirects to MFA | App, role or Workspace role is sensitive or step-up is older than ten minutes | Complete TOTP verification |
| App-role update previously showed `FRESH_MFA_REQUIRED` / page could not load | Administrator's approved ten-minute TOTP freshness expired | On the current release, complete the automatic authenticator redirect, return to app edit, then deliberately submit the change again |
| Flow missing-token page from direct URL | Launch route was opened without a Workspace assertion | Start from Workspace; this confirms Flow owns the public route |
| Flow invalid-token response | Token verification, inactive/unprovisioned user, role conflict, replay, database or session creation failure | Start a fresh launch, collect the displayed support reference, locate `workspace_launch_failed` in Flow runtime logs and follow the [code-specific runbook](runbooks/flow-handoff-troubleshooting.md); never copy the token |
| Global logout 404 | Child points to obsolete `/logout` behavior or old deployment | Confirm current W28 deployment and configured Workspace return/global logout URLs |
| Revoked user still has Flow session | Event delivery pending/failed or obsolete child deployment | Inspect outbox state/logs, retry through approved worker, verify receiver; do not regrant |

## Organization Setup and workbooks

| Symptom | Likely cause | Safe action |
|---|---|---|
| `(void 0) is not a constructor` | Obsolete ExcelJS package-root import deployment | Deploy W32 or later |
| `use server file can only export async functions` | Obsolete W31 server-action module | Deploy W32 or later |
| `Cannot find module 'fast-csv'` | Vercel trace omitted ExcelJS dynamic dependencies | Deploy W33 or later and confirm trace-verification build message |
| Workbook validation fails | Wrong sheets/headers, unsafe workbook features, stale IDs, row limits or prohibited hierarchy move | Download a fresh template/current workbook and correct reported rows |
| Table requires desktop horizontal scrolling | Obsolete side-by-side layout | Deploy W34 or later; narrow phones may still scroll the table |

## Deployment

| Symptom | Likely cause | Safe action |
|---|---|---|
| Vercel says Ready but page returns 500 | Runtime initialization/configuration or packaging failure | Inspect runtime logs, not only build logs |
| Production requires `kms` | Production signer policy is enforced | Do not use software keys; production adapter/provider approval is still required |
| `AUTH_URL must be a valid absolute URL` | Missing `https://` or wrong Vercel scope | Enter the complete environment URL and redeploy |
| Server Action forwarded-host mismatch | Browser origin and forwarded host differ | Use the approved public origin and exact allowed-origin setting; do not add wildcards |
| Database SSL warning | Ambiguous `sslmode=require` semantics in the driver | Use provider-supported `sslmode=verify-full` after verifying provider requirements |
| Documentation check fails | Missing living document or broken local Markdown link | Correct the reported path; do not remove the check |

## Escalation record

Provide environment, time, public route, exact sanitized message, correlation ID, deployed commit and last approved
admin action. Escalate security events, suspected credential disclosure, unexplained privilege, repeated login abuse,
lost privileged authentication and failed revocation immediately through ITF's approved incident channel.
