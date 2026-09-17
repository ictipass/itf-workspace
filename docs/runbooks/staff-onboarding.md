# Staff onboarding runbook

Status: **Create-only ordinary-staff path implemented and staging-accepted; full lifecycle incomplete**

## Purpose

Create ordinary Workspace staff from an HR-authoritative CSV or individual entry, deliver temporary credentials and provision approved
ITF Flow entitlements without permitting spreadsheet-based privilege escalation.

## Authorization and data handling

- HR supplies the authoritative staff list to ICT through an approved channel.
- A `SYSTEM_ADMIN` performs the import with fresh TOTP for the live write.
- The spreadsheet may specify only `workspaceRole=STAFF`.
- Protect the source file as staff data. Do not commit it, attach it to public tickets or retain generated credentials.
- Privileged Workspace roles are outside this workflow.

## Prerequisites

Before preparing the CSV:

1. Confirm each office/department/division/unit/position exists and is active.
2. Download fresh **Reference Codes** from Workspace.
3. Confirm ITF Flow is registered and active if `itfFlowRole` will be used.
4. Confirm every requested Flow role is active and classified under **Manage Apps > ITF Flow**.
5. Confirm Workspace and Flow staging integration secrets/endpoints are healthy before a test import.
6. Use non-sensitive test data for acceptance exercises.

## Single-staff alternative

1. Sign in as `SYSTEM_ADMIN` and open **Administration → Users → Add Staff**.
2. Use HR-confirmed details; preserve leading zeroes in the staff number. Do not invent a staff identity.
3. Select an active office and optional department/division/unit/position. Select parents before children. A supervisor
   staff number, if supplied, must already exist.
4. Record the HR source reference (reference only, not copied staff data) and confirm HR authority.
5. Choose **Add staff and send welcome**. If TOTP is stale, use **Verify authenticator in another tab**, return to the
   original form and deliberately submit again. Entered details remain on that page.
6. Confirm directory/audit state and email delivery. The new account is `STAFF` with mandatory password replacement.
7. Grant approved application access separately under **App Access**. For Flow, synchronize before first launch.

This form creates no Workspace administrator role or app entitlement. Uniqueness and reference validations are shared
with CSV import. If the result says account creation succeeded but delivery failed, do not add it again; escalate under
W25/D10. Provider acceptance is not proof of inbox delivery. There is no automatic credential reissue/retry yet.

## CSV contract

Required headers, in the supplied template:

```text
staffNumber,fullName,email,workspaceRole,officeCode,departmentCode,divisionCode,unitCode,positionCode,supervisorStaffNumber,itfFlowRole
```

| Field | Requirement |
|---|---|
| `staffNumber` | Required, unique in the file and Workspace; preserve leading zeroes |
| `fullName` | Required |
| `email` | Required valid official address, unique in the file and Workspace |
| `workspaceRole` | Required exact value `STAFF` |
| `officeCode` | Required active Workspace reference |
| `departmentCode` | Optional; if supplied, must belong to the selected office |
| `divisionCode` | Optional; if supplied, must belong to the selected department |
| `unitCode` | Optional; if supplied, must belong to the selected division |
| `positionCode` | Optional active Workspace reference |
| `supervisorStaffNumber` | Optional; must already exist or appear in the same CSV, and cannot be self |
| `itfFlowRole` | Optional; normalized to uppercase and must match an active classified Flow role |

Blank optional cells must remain present between commas. Use the downloaded template rather than recreating headers.

## Recommended dry run

The UI currently allows a live import without a prior dry run, but ICT should use dry run for every operational batch:

1. Open **Administration > Users > Bulk Import Users**.
2. Select the CSV.
3. select **Validate only (dry run)**.
4. Choose **Import Users**.
5. Confirm the result reports the expected row count and that no data changed.
6. Correct every error in the source file and repeat until clean.

Dry-run success does not reserve staff numbers, email addresses or reference data. Perform the live import promptly
from the unchanged, reviewed file.

## Live import

1. Confirm the intended row count independently. The importer processes every non-empty data row.
2. Confirm no privileged Workspace role appears.
3. Clear **Validate only (dry run)**.
4. Submit and complete fresh TOTP when required.
5. Confirm the success count exactly matches the reviewed data rows.
6. Review the user directory and audit log.
7. Confirm welcome emails arrived through the approved support channel.

The database write is all-or-nothing. Welcome emails occur after database commit and do not yet have a durable,
operator-visible retry queue; delivery failure therefore requires controlled support escalation and must not be
worked around by re-importing existing identities.

## First-login acceptance

For a controlled sample user:

1. Open the official Workspace login URL from the welcome email.
2. Sign in with official email and temporary password.
3. Replace the temporary password.
4. Confirm ordinary Workspace login succeeds.
5. Confirm only entitled and classified apps are launch-enabled.
6. If access is sensitive, complete TOTP enrollment/verification.

Support must never ask the user to send the temporary password or authenticator details.

## ITF Flow provisioning and launch

After the live import:

1. Open **Bulk Import Users** as `SYSTEM_ADMIN`.
2. Select **Synchronize entitled staff to ITF Flow**.
3. Confirm the synchronized total and created/updated/inactive counts are plausible.
4. If synchronization reports unclassified roles, classify those roles through **Manage Apps** after approval; do not
   change source code or manipulate tables.
5. Ask the controlled user to refresh **My Apps**.
6. Confirm **Launch App** is enabled and the role badge is correct.
7. Launch Flow and confirm the expected Flow identity, role and organization placement.

Synchronization processes all active Flow entitlements, not only the user currently being tested.

## Common validation outcomes

| Message/condition | Meaning | Action |
|---|---|---|
| Existing email/staff number | Import is create-only | Remove the row and use an approved future reconciliation workflow |
| Organization code missing | Reference absent/inactive or stale file | Correct Organization Setup and download fresh codes |
| Hierarchy mismatch | Child code does not belong to supplied parent | Correct the row using current references |
| Role not active/classified | Registry has no active exact role policy | Obtain classification approval and configure the app first |
| `Role classification required` | Entitlement exists, role policy absent/inactive | Configure exact role, synchronize, refresh catalogue |
| Welcome email missing | Post-commit delivery issue | Verify user/audit state and escalate; do not expose or invent credentials |

## Current completion boundary

Accepted in staging:

- HR CSV validation and ordinary `STAFF` creation;
- random temporary credential and welcome delivery;
- forced password replacement;
- Workspace login;
- registry-governed `OFFICER = STANDARD` entitlement;
- Flow directory synchronization and first Flow launch.

Not yet complete:

- existing-user correction and HR reconciliation;
- transfers, suspension/exit reconciliation and rehire;
- durable welcome-email delivery, retry and operator state;
- temporary-password expiry, governed reissue and general recovery;
- general privileged-role grant/revoke workflow;
- official-email-domain/eligibility policy;
- large-batch performance, resumability and reconciliation reporting.

See [W25](../slices/W25-staff-master-list-onboarding.md) for the authoritative remaining scope.
