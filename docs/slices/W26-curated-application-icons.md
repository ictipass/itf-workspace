# W26 — Curated application icon catalogue

## Outcome

Workspace administrators select a recognizable icon when registering or editing a child application. Staff see that
same icon in the application catalogue, and administrators see it in the registry table. The feature uses stable,
centrally defined icon keys rather than executable markup, uploaded files or external icon URLs.

## Implementation

- `lib/apps/app-icons.ts` defines 16 stable icon keys and plain-language labels.
- `components/apps/app-icon.tsx` maps approved keys to the existing Lucide icon system and renders a deterministic
  general-application fallback for null, unknown or legacy database values.
- `components/apps/app-icon-picker.tsx` provides an accessible visual radio-card selector for application create and
  edit forms.
- Application create and update actions reject any icon value outside the curated server-side allow-list.
- Staff catalogue cards and the administrator registry render the selected icon consistently.
- The development seed classifies ITF Flow with the `workflow` icon.

## Enterprise considerations

- **Security:** persisted values are inert allow-listed identifiers; arbitrary SVG, HTML and remote URLs are not
  accepted. UI selection is backed by server-side validation.
- **Performance:** only 16 statically imported vector components are bundled; no image upload, storage lookup or remote
  request is introduced.
- **Scalability:** new approved icons can be added centrally without changing the database schema or existing records.
- **Maintainability:** labels, keys, validation and fallback behavior have one source of truth.
- **Accessibility:** every choice has a visible label, native radio-group semantics and keyboard focus treatment. Icons
  are decorative where their adjacent application name supplies the accessible label.

## Verification

- 65 Workspace regression tests pass across 12 suites. Three W26 cases verify key/label parity, rejection of markup
  and remote URL values, and deterministic handling of missing or legacy values.
- ESLint passes.
- The optimized Next.js production build, TypeScript validation and static-page generation pass.
- No database migration or environment variable is required because the existing nullable `App.icon` column stores the
  stable key.

## Operational effect and rollback

Administrators choose an icon from the registry form; staff can identify applications more quickly without treating
the icon as an authorization signal. Entitlement, assurance and launch controls are unchanged.

Rollback may remove the selector and renderer while retaining stored keys. Existing records remain valid because the
column is unchanged and unknown values already fall back to the general-application icon.

## Evidence

- Implementation and tests: `2965023`
- Documentation/register: this documentation commit
