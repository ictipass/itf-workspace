# W33 - Organization workbook deployment packaging

Status: **Implemented; staging redeployment required**

Implementation commit: `84878a0`

## Outcome

The Organization Setup workbook parser and download endpoint can load on Vercel without a runtime
`Cannot find module 'fast-csv'` failure. A deployment cannot silently pass its build if the required workbook runtime
packages are missing from either affected server-function trace.

## Root cause

`@excel.js/exceljs` uses Node's `createRequire()` to load parts of its dependency graph. Next.js output tracing could
not infer those dynamic module names, so the Vercel bundle contained ExcelJS but omitted `fast-csv`. Vercel therefore
reported the deployment as Ready while the function failed only when Organization Setup loaded.

## Implemented behavior

- Next.js output tracing explicitly includes ExcelJS and the complete transitive runtime graph used by workbook
  parsing and generation.
- Inclusion is restricted to `/dashboard/admin/setup` and `/api/admin/setup/organization-workbook`; unrelated server
  functions do not receive the larger workbook bundle.
- The repository build now inspects both generated `.nft.json` files and fails unless all required package roots are
  present. This converts the prior runtime-only defect into a deployment-time failure.
- No application dependency version was changed.

## Visible UI effect

There is no layout or workflow change. The existing Organization Setup page and blank/current workbook download
controls now load successfully in the deployed runtime.

## Migration, configuration and deployment

No database migration, seed, environment variable or secret is required.

1. Push `84878a0` and the accompanying documentation commit to the staging branch.
2. Redeploy Workspace. Keep the existing Vercel Build Command; `npm run build` now invokes the trace verification.
3. Confirm the deployment build log ends with
   `Organization workbook runtime dependencies are present in the deployment traces.`
4. Open **Administration > Organization Setup** as a system administrator.
5. Download both the blank template and current-data workbook and confirm each is a readable `.xlsx` file.
6. Create one controlled test office and confirm the success response and audit entry.
7. Confirm Vercel runtime logs contain neither `MODULE_NOT_FOUND` nor invalid `use server` export errors.

## Verification

- 81/81 tests pass across 15 suites.
- ESLint and the optimized Next.js 16.3.4 production build pass.
- The post-build verifier confirms all 12 required package roots in both affected function traces.
- The governed production dependency audit reports zero vulnerabilities.
- `git diff --check` passes apart from existing LF-to-CRLF notices.

## Rollback

Revert `84878a0` to restore the earlier build behavior. This is a code-only packaging change, so rollback has no data
effect. The workbook features will again be unsafe to deploy on Vercel until an equivalent trace-compatible packaging
mechanism is provided.

## Next action

Accept W33 in Workspace staging, then create the dedicated ordinary test identity and execute A01-02
role-change/mismatch acceptance using explicitly approved old and new ITF Flow roles.
