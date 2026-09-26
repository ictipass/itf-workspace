# W44 — Existing-user reporting-line reconciliation

## Outcome

A Workspace System Administrator can correct an existing staff member's supervisor from the User Directory without
direct database editing. The correction is governed, audited and synchronized to ITF Flow through the existing Flow
directory connector so action-recipient search follows the approved reporting hierarchy.

## Delivered

- A **Routing** action on every User Directory row showing the current supervisor.
- Per-user organization/Flow context showing organization placement, current Flow role and supervisor.
- Supervisor correction by authoritative supervisor staff number, including intentional removal.
- Mandatory HR source reference and meaningful correction reason.
- System Administrator and fresh-TOTP enforcement in the server action.
- Stale-page protection, active-supervisor validation, self-supervision denial and indirect cycle prevention.
- `USER_UPDATED` audit evidence with old/new supervisor identifiers and a Flow synchronization-required marker.
- Direct links to the existing App Access role correction and Flow directory synchronization workflows.

## Boundaries

- This is a narrow reporting-line correction, not general HR lifecycle reconciliation or bulk transfer processing.
- Flow app roles remain governed by **App Access**; this slice creates no second role-grant path.
- The correction is not pushed directly inside the database transaction. An administrator must run the existing
  bounded Flow directory synchronization after reviewing all related role/reporting changes.
- No schema migration or environment variable is required.

## Rollback and recovery

Use the same page with the prior approved supervisor staff number and a new HR source reference/reason, then
synchronize Flow again. Never correct the relationship directly in either database.

## Acceptance

- Unauthorized and stale submissions fail closed.
- Self/indirect reporting cycles are rejected.
- The change and evidence are atomic.
- The UI clearly separates reporting-line correction, Flow role correction and Flow synchronization.
