# ITF Workspace administrator and support guide

## Audience

This guide is for ICT system administrators, application administrators and support officers. It describes current
behavior. Functions marked as incomplete must be escalated rather than improvised through database edits.

## Roles and authority

| Role | Current capability |
|---|---|
| `STAFF` | Sign in, replace temporary password, view the complete app catalogue, launch entitled/classified apps and manage own sessions |
| `APP_ADMIN` | Reserved privileged role; always requires TOTP, but a complete delegated app-administration workflow is not yet implemented |
| `SYSTEM_ADMIN` | Organization setup, app registry, role classification, staff import, directory sync, app access, user state, sessions and audit logs |

HR spreadsheets may create `STAFF` accounts only. Privileged Workspace roles require a separate approved workflow;
that general workflow is not yet complete. Never change roles directly in the database as an operational shortcut.

## Daily navigation

- **Dashboard**: summary and entry to the staff catalogue.
- **My Apps**: all active registered apps; unavailable apps remain visible and disabled.
- **My Sessions**: view and terminate the current user's Workspace sessions.
- **Organization Setup**: offices, departments, divisions, units, positions and controlled bulk organization import.
- **Manage Apps**: register applications in the top panel, then review the full-width registry table below it; edit
  metadata and classify child roles.
- **Users**: search/filter staff, activate/deactivate users, inspect app counts and administer sessions.
- **App Access**: grant a classified role in the top panel, then filter the access table by app, search staff and move
  through 25-record pages below it.
- **Bulk Import Users**: create ordinary staff and synchronize entitled identities to ITF Flow.
- **Audit Logs**: review administrative and security events.
- **Admin Help**: expand categorized operational procedures, follow safe resolution steps and identify when escalation
  is required.

## In-product help

`SYSTEM_ADMIN` users can open **Admin Help** from the dashboard navigation. Its categorized procedures are a concise
operational view of this guide and the troubleshooting runbook. Expand only the relevant topic, follow the listed
steps in order and use its direct link to the applicable administrator screen where provided.

The page does not grant permission to bypass an open policy or use direct database changes. If it marks a function as
unavailable or says to escalate, retain the safe evidence listed under Support triage and contact the approved owner.
Developers must update the typed help-topic catalogue and these living guides together when behavior changes.

## Organization setup

Create organization references before importing staff. The dependency order is:

1. offices;
2. departments under offices;
3. divisions under departments;
4. units under divisions;
5. positions.

Codes are operational references used in CSVs and child synchronization. System administrators may correct names,
codes and office types. Department, division and unit parents may be corrected only with the explicit impact
confirmation; Workspace preserves immutable IDs and records old/new parent evidence.

For large structures, use the controlled organization workbook process. Always perform the mandatory dry run, retain
the digest-bound validation result only for its short validity period, apply with fresh TOTP and download refreshed
reference codes afterward. Bulk imports cannot move hierarchy parents or delete records.

## Staff onboarding

Use the [staff onboarding runbook](runbooks/staff-onboarding.md). The safe sequence is:

For one HR-confirmed staff member, use **User Directory → Add Staff** instead of preparing a CSV. The form is
`STAFF`-only, records the HR source reference, requires fresh TOTP and sends the existing welcome email. Grant app
access separately and synchronize Flow before launch. Account-created/email-failed is not a failed database write;
do not repeat creation. Bulk import remains available for batches.

1. confirm organization and app-role prerequisites;
2. download a fresh CSV template and reference codes;
3. prepare and protect the HR file;
4. use **Validate only (dry run)** first;
5. correct every error and repeat validation;
6. perform the live import with fresh TOTP;
7. confirm welcome-email delivery and temporary-password replacement;
8. synchronize Flow-entitled users;
9. test Workspace and child-app launch.

The current importer creates new users only. Do not use it to update existing staff, transfers, exits or lost
credentials. Those lifecycle workflows remain incomplete and must be escalated.

## Diagnosing a rejected Flow launch

For Flow's generic `invalid-token` page, collect only the new support reference/time and follow the
[Flow handoff troubleshooting runbook](runbooks/flow-handoff-troubleshooting.md). Do not request launch tokens.

## Registering and configuring an app

An app registry entry requires an approved name, unique lowercase slug, launch URL, launch audience, category,
environment, status, icon and application assurance classification. URLs are operational configuration and must point
to the correct environment.

Every assignable child-app role must then be added under **Child-app role assurance** as `STANDARD` or `SENSITIVE`.
No entitlement should be granted before the exact role code is active and classified. A sensitive app or role requires
TOTP; the more restrictive classification wins.

Role-assurance updates require a TOTP verification no more than ten minutes old. If it has expired, Workspace opens
the authenticator page and returns to the same app edit screen. Review and submit the intended change again; Workspace
does not automatically replay a security-sensitive mutation after reauthentication.

Registering metadata alone does not integrate an app. The child must implement and pass the contracts in the
[child-app onboarding runbook](runbooks/child-app-onboarding.md).

## Granting and revoking access

To grant access:

1. verify the user is active;
2. verify the app is active;
3. verify the exact child role is approved and classified;
4. open **App Access**;
5. select the user and app/role combination;
6. complete fresh TOTP;
7. for ITF Flow, run directory synchronization before first launch.

Use the app selector first, then search by name, official email or staff number to find an entitlement. Filters apply
before the 25-record pagination and remain selected while moving between pages.

To revoke access, use **App Access** and the existing record's revoke action. Workspace queues a durable revocation
event for ITF Flow and attempts immediate delivery. Confirm the user cannot relaunch and review the audit event.
Continuous retry operation is not yet adequate for a controlled production pilot on the current Vercel Hobby schedule.
If TOTP freshness has expired, Workspace returns to the same filtered access list after verification and asks the
administrator to select **Revoke** again. It does not automatically replay the destructive action.

There is currently no safe **resend onboarding details** action. The original temporary password is not retrievable
from its hash. Escalate failed welcome delivery under W25/D10; do not re-import the user or send an invented password.

## User status and sessions

Deactivating a user prevents authoritative Workspace access and queues applicable Flow session effects. Use the user
directory controls, not direct database updates. Administrators can inspect a user's sessions and terminate one or all.

At the two-session limit, the user receives a restricted recovery path to terminate an existing session. Idle and
absolute session expiry are server-enforced. Child-app activity does not keep Workspace alive.

## MFA and password behavior

- Welcome email contains a random single-use temporary password.
- First login is restricted to password replacement.
- Standard app/role access is password-only under the current interim policy.
- Sensitive apps/roles and privileged Workspace roles require authenticator-app TOTP.
- Email is a notification/recovery channel, not an MFA factor.
- Never request a user's password, temporary password, QR provisioning URI, setup key or TOTP code.

General lost-password recovery and governed temporary-credential reissue remain open under D10. Escalate these cases
to the authorized ICT/security owner; do not create an informal bypass.

## Sign-out behavior

- The normal ITF Flow sign-out ends only the Flow session and returns to the Workspace catalogue.
- The adjacent chevron offers **Sign out of Workspace and all apps**.
- Global sign-out requires confirmation and revokes the current Workspace session plus connected child sessions.
- Other Workspace sessions on separate devices remain active unless explicitly terminated.
- Use the app waffle to move between entitled apps without signing out.

## Audit and evidence

Use **Audit Logs** to search by actor, action and date. Retain only redacted operational references in tickets or
acceptance records. Never copy launch assertions, secrets, staff spreadsheets or authentication material into an
incident record. Audit retention, immutability and SIEM integration remain awaiting D33.

## Support triage

Collect only:

- environment and public URL;
- time in Africa/Lagos and, where available, UTC;
- user staff number or official email through the approved support channel;
- exact page and visible error;
- correlation/request ID where shown;
- expected result and last successful step;
- redacted Vercel log reference;
- recent approved admin action such as import, role change or revocation.

Do not ask for passwords, TOTP codes, QR codes, private keys, bearer secrets, database URLs or launch-token URLs.
Follow the [troubleshooting guide](troubleshooting.md) before escalation.

## Known operational limitations

Authenticator phone loss/replacement and the missing governed reset route are explained in the
[authenticator runbook](runbooks/authenticator-loss-and-replacement.md). Do not remove MFA through database edits.
The exact current button location and batch steps are in the
[Flow synchronization runbook](runbooks/flow-directory-synchronization.md). Both procedures appear in Admin Help.
SYSTEM_ADMIN operators can use the disabled-by-default
[controlled staging diagnostic](acceptance/A01-staging-diagnostic-operations.md) during an explicitly configured window.

- Staff import is create-only; updates, transfers, exits and reconciliation are incomplete.
- Welcome-email delivery is not yet backed by an operator-visible durable retry workflow.
- General password recovery/reissue policy is unresolved.
- General privileged-role administration is incomplete.
- Only ITF Flow has a working first-party integration; connectors are not yet generic.
- Remaining Flow lifecycle acceptance and continuous outbox scheduling block a controlled pilot.
- Production signing cannot operate until the KMS/HSM adapter is implemented.
- Security review, privacy, SIEM, resilience, recovery and production approvals remain open.

Check the [implementation slice register](implementation-slice-register.md) before promising functionality or a date.
