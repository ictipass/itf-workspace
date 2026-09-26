# Synchronize entitled staff to ITF Flow

Status: Implemented Flow connector; support procedure updated 2026-09-17.

## Why synchronization is required

Workspace owns the staff identity and entitlement. Flow also needs a local directory record with the same immutable
Workspace user ID and approved Flow role. Granting access in Workspace does not, by itself, populate or update that
record. A missing, inactive or role-mismatched record can cause the generic invalid-token handoff response.
Synchronization reconciles the approved directory; it does not grant access or bypass MFA.

## Operator steps

1. Sign in as Workspace `SYSTEM_ADMIN`.
2. Confirm the staff account is active, Flow access is granted, the exact assigned child role is correct and classified,
   and the user's supervisor is correct in **User Directory → Routing**. `OFFICER = STANDARD` is only the ordinary
   test baseline; do not assign managers as officers merely to make synchronization pass.
3. Review pending revocations before restoring access. Do not regrant while an older revocation remains undelivered;
   escalate conflicting lifecycle operations instead of repeatedly synchronizing.
4. Open **Administration → Users → Bulk Import Users**.
5. Select **Synchronize entitled staff to ITF Flow**. The batch processes **all active Flow entitlements**, not one
   selected row. A spreadsheet is not required for this action.
6. Review the reported total, batch, created, updated and inactive counts. If a batch fails, earlier batches may have
   applied; resolve the reported issue and rerun through the approved interface. The current UI is not a per-user
   partial-failure reconciliation dashboard. Do not edit Flow user IDs directly.
7. Ask the staff member to make a new launch from the Workspace catalogue. A rejected handoff URL is not reusable.
8. Repeat synchronization after new grants, approved role changes, reporting-line corrections and regrants where
   directory reconciliation is needed. Entitlement removal uses the separate durable revocation channel, not directory synchronization.

Support evidence should contain only the environment, time, batch outcome and safe reference. Do not retain request
bodies, tokens, staff lists or credentials in tickets or source control.

## Multi-application destination

Moving the control to **App Access**, using the selected app and showing its connector capability and last outcome, is
the recommended UX. This is **not implemented in this release**: the working button remains in Bulk Import Users.
Only Flow currently has an implemented directory connector; a catalogue URL is not a provisioning API.

W17/W18 should introduce capability-aware, versioned connectors before generalizing synchronization. Each child app
must implement the agreed authenticated directory API, immutable-ID/role mapping, idempotent responses and lifecycle
contract. Apps without that capability must show synchronization as unavailable, not receive a fabricated Flow call.
Per-app outcomes, bounded batches, audited operator actions and durable partial-failure retry are part of that design.

See [child-app onboarding](child-app-onboarding.md), [readiness gates](../child-app-readiness-gates.md) and the
[implementation register](../implementation-slice-register.md).
