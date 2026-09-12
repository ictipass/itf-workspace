# W35 - Registry-governed child-app roles in staff onboarding

Status: **Implemented; staging configuration and redeployment required**

Implementation commit: `e8c3477`

Policy: [`2026-09-12 ITF Flow OFFICER assurance directive`](../policies/2026-09-12-itf-flow-officer-assurance-directive.md)

## Outcome

Staff onboarding cannot create or synchronize an ITF Flow entitlement whose role has not been explicitly activated
and classified in the app registry. The registry, rather than a code-level role list, is authoritative.

## Implemented behavior

- Imported role codes are trimmed and normalized to uppercase, then checked for a safe canonical format.
- A requested Flow role must match an active `AppRolePolicy` on an active ITF Flow registry record. One invalid row
  rejects the all-or-nothing import before users or entitlements are created.
- Directory synchronization checks every active Flow entitlement against current active role policies before sending
  any batch. It reports the blocking role codes to the system administrator.
- The previous hard-coded Flow role allow-list and implicit `OFFICER` fallback are removed.
- Clean development seeds create the approved `OFFICER = STANDARD` role policy. Deployed registries are not changed
  implicitly and remain controlled through the audited administrator action.

## Practical effect

The observed state—successful import followed by a disabled **Role classification required** launch button—cannot be
created by a future import. Existing entitlements remain fail-closed until ICT records the approved role policy. New
Flow roles can be introduced through configuration without a source-code release, provided their classifications are
approved and entered first.

## Visible UI effect

The Bulk Import Users page now explains the prerequisite beside the required columns and directory synchronization.
Validation or synchronization returns an explicit unclassified-role error. The staff catalogue behavior is unchanged:
unclassified entitlements remain disabled.

## Migration, configuration and deployment

No database migration, seed run, environment variable or secret is required.

For the current staging identity:

1. Open **Administration > Apps**, edit ITF Flow, and add exact role code `OFFICER` as `STANDARD` under child-app role
   assurance. Fresh TOTP is required and the action is audited.
2. Deploy `e8c3477` and the accompanying documentation commit.
3. Open **Administration > Bulk Import Users** and select **Synchronize entitled staff to ITF Flow**.
4. Refresh the test user's catalogue. Confirm **Launch App** replaces **Role classification required**, then launch.

Do not rerun `db:seed` against staging to apply this policy: that seed also manages development bootstrap data. Use
the administrator UI as described.

## Verification

- 84/84 tests pass across 15 suites.
- ESLint, TypeScript and the optimized Next.js 16.3.4 production build pass.
- The workbook deployment trace check remains successful.
- `git diff --check` passes apart from existing LF-to-CRLF notices.

## Next action

Complete the existing test identity's first synchronized Flow launch. Then choose and approve the new role and
classification needed for A01-02 role-change/mismatch acceptance; D42 classifies only the initial `OFFICER` role.
