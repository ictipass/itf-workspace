# W36 - Living developer and administrator documentation

Status: **Implemented**

Implementation commit: `2124c81`

## Outcome

Developers, system administrators and support officers have separate, connected documentation paths grounded in the
same implementation and policy sources of truth. Documentation integrity is checked during every production build.

## Implemented documentation

- A central documentation hub routes each audience to the appropriate guide, runbook and authority.
- The developer guide covers architecture, data boundaries, authentication/session behavior, launch signing,
  integrations, local setup, migrations, verification, deployment, rollback and known gaps.
- The administrator/support guide covers current roles, navigation, organization setup, staff/app operations,
  sessions, MFA, sign-out, audit, support evidence and explicit escalation boundaries.
- The staff onboarding runbook distinguishes the accepted create/first-launch path from incomplete lifecycle work.
- The child-app onboarding runbook defines intake, policy, receiver contracts, registry/connector configuration,
  staging acceptance, pilot, production and evidence requirements.
- The environment reference documents every current `.env.example` setting, aliases, ranges, secret types and key
  generation/custody boundaries.
- The troubleshooting guide maps current user-visible and deployment failures to safe operator actions.
- The documentation governance standard defines mandatory updates for every feature, defect, policy, migration,
  configuration and integration change.

## Automated maintenance control

`npm run docs:check` walks the repository's Markdown graph, rejects local links that escape the repository, reports
missing targets and confirms the required living-document set exists. `npm run build` invokes this check before the
Next.js build, so broken documentation cannot pass the normal deployment command.

This automation verifies structure, not factual accuracy. The implementation/policy register review and mandatory
update matrix remain required for every change.

## Visible UI effect

None in the Workspace application. Developer commands and build logs now show documentation verification.

## Migration, configuration and deployment

No database migration, seed, environment variable or secret is required. Deploy the commit normally. The existing
Vercel build command uses `npm run build`, so it receives the documentation check automatically.

## Verification

- Documentation verification passes for the complete Markdown set.
- 84/84 application regressions pass across 15 suites.
- ESLint, TypeScript, optimized production build and workbook runtime tracing pass.
- `git diff --check` passes apart from existing LF-to-CRLF notices.

## Ongoing rule

Every later feature or fix must use the update matrix in
[`documentation-governance.md`](../documentation-governance.md). W36 creates a maintained baseline; it does not claim
that unimplemented staff lifecycle, generic child connectors or production-readiness work is complete.
