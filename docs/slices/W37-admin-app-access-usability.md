# W37 — Application administration usability and fresh-MFA recovery

Status: **Implemented; primary staging acceptance passed, revocation-recovery follow-up requires redeployment**

Implementation commits: `7344aca`; revocation fresh-MFA correction `ec760ee`

## Outcome

Application registry and access administration now remain usable as the number of child apps and entitlements grows.
The security-sensitive role-assurance mutation also recovers through the approved TOTP step-up screen when the
administrator's ten-minute freshness window has elapsed, instead of surfacing an unhandled Server Action error.

## Implemented changes

- **Manage Apps** stacks the registration form above a full-width registered-app table.
- **App Access** stacks the grant form above a full-width existing-access table.
- Existing access can be filtered by one registered app and searched, within that app, by staff name, official email
  or staff number.
- Filtering and search execute in the database before fixed 25-row server-side pagination; the selected filters remain
  in Previous/Next links.
- Only active apps remain grantable, while inactive app records remain available in the historical access filter.
- An expired fresh-TOTP check during a child-role assurance update redirects to authenticator verification, returns to
  the same app edit page, and tells the administrator to review and submit the mutation again. The mutation is never
  replayed automatically after reauthentication.
- The same recovery now protects entitlement revocation, retains the current app/search/page view and requires the
  administrator to select **Revoke** again after TOTP. This closes the unhandled error found while starting A01-05.

## Security and scaling properties

- The existing D05 ten-minute step-up rule is unchanged; only its recovery experience changed.
- App, search and page query parameters are normalized server-side. Unknown app IDs fall back to the unfiltered view,
  page numbers are clamped and only one bounded page is loaded.
- Search and display do not broaden authorization: the page still requires authoritative `SYSTEM_ADMIN` access.
- Reauthentication returns only to a local `/dashboard` path.

## Deliberately excluded: onboarding-detail resend

No resend action was added. Workspace stores only a password hash after import and therefore cannot retrieve or resend
the original temporary password. A secure action must generate a new single-use credential, invalidate the previous
credential and active sessions, use an operator-visible durable delivery record, apply expiry/rate limits and record
an audit event. Identity proofing, authorized operators, expiry and recovery behavior remain open under D10 and W25.
Adding an icon before those controls exist would present an unsafe or non-functional recovery path.

## Verification

- Three new regression cases cover vertical layouts, database filter/search/pagination wiring and fresh-TOTP redirect
  recovery.
- The complete suite passes: 87 tests across 16 suites.
- TypeScript and ESLint pass.
- No database migration or environment variable was added.

## Deployment and acceptance

ITF accepted the vertical layouts, filters/pagination and role-assurance fresh-TOTP recovery on 2026-09-14. Redeploy
the `ec760ee` follow-up, then verify:

1. **Manage Apps** shows the complete registration form above the registered-app table.
2. **App Access** shows the grant form above the existing-access table.
3. Selecting ITF Flow and searching a known staff identifier returns only matching ITF Flow access records.
4. More than 25 matching records, when present, expose working Previous/Next controls that retain filters.
5. After the ten-minute TOTP freshness window, selecting **Revoke** opens authenticator verification, returns to the
   same filtered access page, performs no revocation automatically, and succeeds only after a deliberate second click.

Rollback is the application commit only. Existing data and classifications require no rollback migration.
