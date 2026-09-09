# W30 - Organization reference-data corrections

Status: **Implemented**

Implementation commit: `01d74d8`

## Outcome

System administrators can correct reference-data codes from Organization Setup instead of deleting and recreating
records. Office records additionally allow correction of their office type. Existing staff and hierarchy records stay
attached because relationships continue to use immutable database identifiers rather than editable codes.

## Implemented behavior

- The edit dialog exposes display name and code for offices, departments, divisions, units and positions.
- Office edits also expose the complete controlled `OfficeType` catalogue.
- Codes are trimmed, normalized to uppercase, limited to 64 characters and restricted to letters, numbers,
  underscores and hyphens.
- Duplicate office and position codes are rejected globally. Department and division codes are checked within their
  existing parent, while unit codes are checked within their existing division.
- Parent/hierarchy reassignment remains outside this slice; correcting a code or office type does not move a record.
- The record correction and its audit event are committed atomically. Audit metadata retains the previous and new
  display name, code and applicable office type.
- The success response directs ICT to download refreshed reference codes before another HR import and synchronize
  affected child applications.

## Visible UI effect

The Organization Setup edit modal is now titled **Edit reference data**. It contains an editable code field for every
reference entity and an **Office type** selector for offices. It also explains that existing spreadsheet values using
an old code must be corrected.

## Migration, configuration and deployment

No database migration, seed or environment variable is required. Deploy Workspace commit `01d74d8`, edit the
incorrect reference record, download a new reference-code CSV, and use the corrected code in the staging staff import.
If users linked to the record were already provisioned to a child application, run its directory synchronization.

## Verification

- 72/72 security and regression tests pass across 14 suites.
- The new policy cases cover uppercase normalization, required office type, non-office updates and unsafe code
  rejection.
- ESLint and the optimized production build pass.
- `git diff --check` passes apart from the repository's existing LF-to-CRLF notices.

## Next action

Use the corrected organization data to create the dedicated ordinary staging user, then execute A01-02
role-change/mismatch acceptance with explicitly approved old and new standard ITF Flow roles.

