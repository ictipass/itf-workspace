# Organization hierarchy-correction directive

Status: **Approved (interim)**

- Approving authority: Super administrator
- Approval date: 2026-09-12
- Evidence: Workspace Organization Setup correction request
- Applies to: manual corrections of departments, divisions and units

## Approved outcome

A Workspace system administrator may correct the immediate parent of an existing organization reference record:

- a department may move to another office;
- a division may move to another department; and
- a unit may move to another division.

The record's immutable identifier is preserved, so staff and descendant records remain attached. Their effective
organization path changes with the corrected parent. The administrator must explicitly confirm a parent change, and
the target parent must exist and be active. Workspace must reject duplicate codes within the new parent scope and
commit the correction and audit evidence atomically.

Audit metadata must retain the actor, entity, record ID, previous and new parent IDs, applicable parent type, and the
previous and new editable field values. ICT must download fresh reference codes and synchronize affected child
applications after a hierarchy correction.

This directive does not authorize bulk hierarchy moves, deletion, or record replacement. The D40 bulk-import boundary
continues to reject hierarchy changes.
