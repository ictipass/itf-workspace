# W38 — In-product administrator support centre

Status: **Implemented; staging redeployment required**

Implementation commit: `04de237`

## Outcome

System administrators can consult current operational guidance without opening repository Markdown or relying on chat
history. The protected **Admin Help** page groups common tasks and failures into expandable topics with practical
steps, escalation boundaries and links to the relevant Workspace screens.

## Implemented scope

- Added `/dashboard/admin/help`, protected by authoritative `SYSTEM_ADMIN` authorization.
- Added **Admin Help** to the system-administrator navigation.
- Added seven expandable categories: authentication/sessions, organization setup, staff onboarding, app registry,
  app access/revocation, Flow integration/sign-out and deployment/runtime incidents.
- Added structured entries containing the challenge, an explanation, ordered resolution steps, optional navigation
  and explicit escalation conditions.
- Added a prominent rule prohibiting authentication, integration and database secrets in support evidence.
- Kept content in a typed central module so additions do not require duplicating page markup.

## Boundaries

The page documents implemented behavior; it does not grant new authority, weaken a policy gate, read runtime logs or
expose repository documents. Unsupported operations such as credential reissue are marked for escalation. The living
Markdown guides remain the detailed developer and governance record and must be updated with the structured in-app
content when affected procedures change.

## Visible UI effect

`SYSTEM_ADMIN` users see **Admin Help** in the left navigation. The page contains expandable topic cards, step lists,
safe escalation notices and selected links to operational screens. Other roles cannot open the route.

## Verification

- Three new regressions prove topic integrity, required coverage, route authorization and accordion rendering.
- The complete Workspace suite passes 90 tests across 17 suites.
- TypeScript, ESLint and the 28-route production build pass.
- Documentation validation and organization-workbook deployment trace verification pass.
- No migration or environment variable is required.

## Deployment and acceptance

Redeploy Workspace staging, sign in as `SYSTEM_ADMIN`, select **Admin Help**, expand every category and test the links.
Confirm a non-system administrator cannot open `/dashboard/admin/help`. Rollback is the application commit only; no
data rollback is required.
