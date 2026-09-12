# W32 - Organization Setup runtime and hierarchy corrections

Status: **Implemented; staging redeployment required**

Implementation commit: `c211185`

Policy: [`2026-09-12 organization hierarchy-correction directive`](../policies/2026-09-12-organization-hierarchy-correction-directive.md)

## Outcome

Organization Setup server actions load correctly in the deployed Vercel runtime, and system administrators can
correct an incorrectly assigned office, department or division without deleting and recreating records.

## Runtime corrections

- The W31 Excel dependency exports its workbook constructor through the `@excel.js/exceljs/workbook` ESM subpath,
  not the package-root named export previously used. The parser now imports the actual runtime constructor, with a
  local declaration that retains TypeScript checking.
- The W31 `"use server"` action file previously exported a non-function initial-state object. That state now lives in
  its client form, leaving the server module with async action exports only as Next.js requires.
- A regression test now loads and constructs the real workbook runtime, and contract coverage rejects a return of the
  prohibited server-module state export.

The PostgreSQL `sslmode=require` message in the supplied log is a driver migration warning, not the cause of either
runtime failure. For the current certificate-verifying behavior without future semantic ambiguity, deployed database
URLs should use `sslmode=verify-full` where supported by the selected PostgreSQL provider.

## Hierarchy correction behavior

- Department edit dialogs expose the office; division dialogs expose the department; unit dialogs expose the
  division. Position already exposes its complete editable business fields, title and code. Active state continues to
  use the adjacent activate/deactivate control.
- The current parent is selected. Inactive parents are visible for context but cannot be selected as a new target.
- Selecting another parent displays a required impact-confirmation checkbox.
- Server validation independently requires the applicable parent, verifies that a changed target is active, checks
  code uniqueness within the new scope, and rejects a forged request without move confirmation.
- The update and audit entry remain atomic. Audit evidence includes previous/new parent IDs and parent entity type.
- Immutable record identifiers preserve linked staff and descendants; their effective hierarchy resolves through the
  corrected parent. The success message directs ICT to refresh reference codes and child-app synchronization.

## Visible UI effect

The existing **Edit reference data** dialog now includes **Office**, **Department**, or **Division** as applicable.
Changing the selection displays an amber confirmation notice explaining the effect on linked staff and descendants.
Office editing remains name/code/type, while position editing remains title/code because neither entity has a parent.

## Migration, configuration and deployment

No migration, seed, new environment variable or secret is required.

1. Deploy Workspace commit `c211185` and the accompanying documentation commit.
2. Redeploy the staging branch; a rebuild is required because the failure was in the bundled server runtime.
3. Recommended separately: change the staging `DATABASE_URL` query from `sslmode=require` to
   `sslmode=verify-full` if the database provider supports standard certificate verification, then redeploy.
4. As a system administrator, create a controlled test office and confirm the success response.
5. Download the blank organization workbook to exercise the corrected Excel constructor.
6. Edit a test division, choose another active department, confirm the impact checkbox and save.
7. Verify the table shows the new department and the audit log contains the old and new parent IDs.
8. Download fresh reference codes and synchronize affected child applications before staging acceptance.

## Verification

- 81/81 tests pass across 15 suites.
- New checks construct the real ESM workbook and cover parent requirements, persistence fields, explicit move
  confirmation and before/after parent audit evidence.
- TypeScript, ESLint and the optimized Next.js 16.3.4 production build pass.
- `git diff --check` passes apart from existing LF-to-CRLF notices.

## Next action

After accepting W32 in staging, create the dedicated ordinary staging identity and execute A01-02
role-change/mismatch acceptance using explicitly approved old and new ITF Flow roles.
