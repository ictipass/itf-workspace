# W46 — Mobile navigation and user organization corrections

## Outcome

Signed-in Workspace navigation remains reachable on a phone or tablet, and SYSTEM_ADMIN users can correct an existing
staff member's HR-authoritative organizational placement from the user directory without editing the database directly.

## What changed

- The dashboard header now exposes an accessible mobile menu below the desktop `lg` breakpoint. It contains the same
  role-filtered navigation as the desktop sidebar, closes after navigation, and retains global sign-out.
- Each User Directory row now places **Edit organisation**, **Manage sessions**, and status change actions in a compact
  three-dot menu.
- The former supervisor-only Routing page is now **Edit user details**. It supports active office, department,
  division, unit, position and supervisor corrections in one transaction.
- Every correction requires SYSTEM_ADMIN authorization, fresh TOTP, an HR source reference and a reason; validates the
  hierarchy and reporting-line cycles; uses optimistic concurrency; and records a `USER_UPDATED` audit event.
- The edit form deliberately excludes Workspace and child-app role mutation. Flow roles remain in App Access. Workspace
  privileged roles remain a separate, approved super-administrator process.

## Operational effect

Mobile staff and administrators can now reach My Apps, sessions, authenticator security and permitted administration
without relying on a hidden desktop sidebar. HR-authorized transfers and corrections can be fixed safely, then
synchronized to ITF Flow, without re-importing a staff member.

## Verification

- TypeScript check passes.
- ESLint passes.
- Security/UI regression tests assert the mobile trigger, compact action menu, fresh-TOTP server-side enforcement,
  hierarchy/cycle safeguards, audit event and role-boundary exclusion.

## Deployment

No migration, seed or environment-variable change is required. Deploy Workspace and confirm:

1. A signed-in phone-width browser opens the header menu and can reach every role-appropriate link.
2. A SYSTEM_ADMIN with fresh TOTP can correct an organization assignment and supervisor, then sees the success message.
3. An invalid parent combination, inactive supervisor and circular reporting line are rejected.
4. The correction appears in Audit Logs and, where Flow uses the changed attributes, **Synchronize entitled staff to ITF
   Flow** succeeds before Flow behavior is retested.
