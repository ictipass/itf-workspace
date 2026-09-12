# W34 - Organization Setup responsive information layout

Status: **Implemented; staging redeployment required**

Implementation commit: `b1ed8be`

## Outcome

System administrators can view and manage organization reference records without horizontally navigating a table
that was unnecessarily constrained by a side-by-side creation form.

## Implemented behavior

- Offices, Departments, Divisions, Units and Positions now share the same vertical information hierarchy: creation
  panel first, full-width entries panel second.
- Creation fields remain stacked on small screens, use two columns at medium widths and form a compact row on wide
  screens. The primary action remains visually adjacent to the fields.
- Entries tables receive the entire available content width.
- The redundant outer overflow wrapper was removed. The shared table component remains the single horizontal-scroll
  boundary when a genuinely narrow viewport cannot fit all columns.
- A regression contract protects the stacked structure and compact wide-screen form layout.

## UX rationale

The creation operation is brief and task-focused, while scanning, comparing and editing existing records is the
dominant information-dense activity. Giving the table full width therefore improves readability without hiding the
creation workflow in a modal or adding another navigation step.

## Visible UI effect

Yes. In every Organization Setup tab, the **Create** card appears above the entries card. On wide screens its inputs
are arranged in one compact row; on smaller screens they wrap predictably. The table below uses the page width and
only scrolls horizontally when the viewport itself is too narrow.

## Migration, configuration and deployment

No database migration, seed, environment variable or secret is required. Deploy `b1ed8be` and the accompanying
documentation commit, then visually verify all five tabs at desktop and mobile widths.

## Verification

- 82/82 tests pass across 15 suites.
- ESLint and the optimized Next.js 16.3.4 production build pass.
- The workbook deployment-trace verification continues to pass.
- `git diff --check` passes apart from existing LF-to-CRLF notices.

## Next action

Accept W33-W34 together in Workspace staging, then execute A01-02 role-change/mismatch acceptance using a dedicated
ordinary staging identity and explicitly approved old and new ITF Flow roles.
