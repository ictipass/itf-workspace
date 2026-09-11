# W31 - Organization reference-data bulk import

Status: **Implemented**

Implementation commits: `449b8b9`; Windows verification follow-up `25b99e7`

Policy: [`2026-09-09 organization reference-data bulk-import directive`](../policies/2026-09-09-organization-reference-data-import-directive.md)

## Outcome

System administrators can establish or correct large organization structures without entering every office,
department, division, unit and position individually. Workspace supplies both a blank workbook and a current-data
workbook whose immutable identifiers make updates explicit and safe.

## Implemented behavior

- Accepts one `.xlsx` workbook with the exact five sheets or five separately named CSV files.
- Blank `recordId` values create records; existing records can only be updated using identifiers exported by
  Workspace. Omission has no effect, and bulk deletion or hierarchy movement is rejected.
- Validates exact headers, field formats, explicit `true`/`false` active states, duplicate code scopes, record IDs and
  the complete office-to-unit parent chain.
- Rejects mixed upload formats, unexpected files/sheets, formulas, hyperlinks, macros, external workbook links,
  malformed ZIP structures and excessive compressed-workbook expansion.
- Requires a successful dry run before apply. The HMAC-SHA256 receipt is short-lived and bound to the administrator
  and exact upload digest; the apply action independently reparses and revalidates the files.
- Requires fresh TOTP at apply time. Database state is revalidated under an advisory transaction lock; all reference
  changes and their audit evidence commit together or roll back together.
- Handles valid code swaps through collision-safe temporary codes while preserving database identifiers and existing
  staff relationships.
- Records individual before/after audit entries and an import summary without placing uploaded files or secrets in the
  audit log.

## Visible UI effect

Organization Setup now includes a **Bulk organization setup** card above the existing per-entity tabs. It provides
blank-template and current-workbook downloads, a multi-file selector, a mandatory dry-run button, a change summary,
row-level validation errors and an apply button shown only after successful validation. If TOTP freshness has expired,
the UI links the administrator to authenticator verification and requires another dry run afterward.

## Configuration and deployment

No database migration or seed is required. These non-secret settings are optional because validated defaults exist:

| Variable | Default | Allowed range | Effect |
|---|---:|---:|---|
| `WORKSPACE_ORG_IMPORT_MAX_FILE_BYTES` | `5242880` | 65,536-20,971,520 | Maximum combined upload bytes |
| `WORKSPACE_ORG_IMPORT_MAX_ROWS_PER_SHEET` | `1000` | 1-5,000 | Maximum non-empty data rows in each sheet/file |
| `WORKSPACE_ORG_IMPORT_VALIDATION_RECEIPT_SECONDS` | `600` | 60-1,800 | Time available to apply an unchanged successful dry run |

If overridden on Vercel, configure the same value for the relevant deployment environment before building and running
the deployment. The Next.js Server Action body ceiling is derived from the file limit with bounded multipart framing
headroom. Existing `AUTH_SECRET` signs validation receipts; W31 introduces no new secret.

Deploy commit `449b8b9`, open Organization Setup as a system administrator, download both workbook variants, and run a
dry run using a controlled staging copy. Export current data immediately before the first applied staging import.
Verify row counts and reference-code downloads afterward, then synchronize child applications affected by changes.
Commit `25b99e7` also makes the configuration, seed and bootstrap TypeScript commands use the repository's existing
Windows-safe launcher; deploy both commits.

## Dependency and security maintenance

W31 uses pinned `@excel.js/exceljs` `0.15.0`, whose introduction added no advisory relative to the prior tree. The same
change updates Next.js and `eslint-config-next` from 16.3.2 to 16.3.4 and refreshes
`baseline-browser-mapping` to a patched compatible transitive release. The governed production-runtime audit command
reports zero known advisories. Development/optional tooling findings remain outside the deployed runtime boundary
documented by W00.

## Verification

- 78/78 regression tests pass across 15 suites, including five W31 contract/security cases and direct receipt binding,
  tamper and expiry assertions.
- TypeScript validation and repository-wide ESLint pass.
- The optimized Next.js 16.3.4 production build passes and includes the protected workbook route.
- `npm audit --omit=dev --omit=optional --audit-level=low` reports zero vulnerabilities.
- `git diff --check` passes apart from the repository's existing LF-to-CRLF notices.

## Rollback

Revert `449b8b9` to remove the import UI, action, workbook route and parser. Reverting code does not reverse reference
records already applied. Retain the pre-import current workbook and audit evidence; field and active-state restoration
can be performed through a reviewed follow-up workbook using the same record IDs. Created records are not deleted by
this slice and require a separately authorized cleanup decision.

## Next action

Create the dedicated ordinary staging identity using the now-established organization references, then execute A01-02
role-change/mismatch acceptance with explicitly approved old and new ITF Flow roles.
