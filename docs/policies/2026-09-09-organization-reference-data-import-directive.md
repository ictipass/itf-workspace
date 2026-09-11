# Organization reference-data bulk-import directive

Status: **Approved (interim)**

- Approving authority: Super administrator
- Approval date: 2026-09-09
- Evidence: Workspace organization-setup implementation approval
- Applies to: offices, departments, divisions, units and positions maintained in ITF Workspace

## Approved boundary

ICT may maintain Workspace organization reference data through either one `.xlsx` workbook containing the exact
worksheets **Offices**, **Departments**, **Divisions**, **Units** and **Positions**, or a set of five correspondingly
named CSV files. A blank `recordId` creates a record. Only an immutable `recordId` obtained from Workspace's current
workbook may update an existing record.

Bulk import may change validated names, codes, office types and explicit active states. It must not delete records,
deactivate omitted records or move an existing record to another hierarchy parent. A separate approved correction
process is required for hierarchy movement or deletion.

## Control requirements

- Only a Workspace `SYSTEM_ADMIN` may download the controlled workbooks, run validation or apply an import.
- A dry run against current database state is mandatory. Apply requires the unchanged upload, an unexpired
  administrator- and digest-bound validation receipt, and fresh TOTP verification.
- Every worksheet/file, header, field, parent reference, immutable identifier and uniqueness scope is validated before
  persistence. Formulas, hyperlinks, macros, external links and unsafe workbook expansion are rejected.
- Persistence is all-or-nothing under a database transaction and import lock. Concurrent organization imports cannot
  interleave.
- Every changed record retains before/after audit metadata plus actor, source, import digest and summary. Audit
  retention and SIEM handling remain governed by open decision D33.
- File size, row count and validation-receipt lifetime are bounded server settings. Changing the bounds is an
  operational configuration change, not permission to weaken the authorization or transaction controls above.
- ICT must export current data before a material import and download fresh reference codes afterward. Affected child
  applications must be synchronized before relying on changed organization attributes.

This directive governs reference data only. It does not allow an organization spreadsheet to create staff accounts,
grant privileged Workspace roles or grant child-application access. D01 and D36 continue to govern those operations.
