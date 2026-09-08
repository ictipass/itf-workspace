# W28 - Split child-app and global Workspace sign-out

Workspace implementation commit: `453a0d3`  
ITF Flow implementation commit: `515e94c`

## Outcome

Flow-only exit and central sign-out are now separate, explicit actions. The Flow main sign-out terminates its local
database session and returns to Workspace's catalogue. Its chevron menu offers global sign-out, which opens a safe
Workspace confirmation page before revoking the current central session and propagating W04 logout events.

## Security behavior

- `GET /logout` only renders confirmation; it never changes session state.
- The confirmation server action revalidates the current authoritative Workspace session, revokes it with
  `USER_SIGN_OUT`, records audit evidence, attempts immediate child delivery and signs out Auth.js.
- A failed receiver call does not restore the Workspace session. The W04 outbox retains bounded retry work.
- Only child sessions carrying the exact current Workspace session ID are targeted. Other Workspace/device sessions
  remain active.
- Flow validates the configured local return as an absolute same-Workspace-origin URL and requires HTTPS in deployed
  production mode, preventing an environment mistake from becoming an external logout redirect.
- Global navigation is derived from the validated Workspace origin and is not independently configurable.

## Visible UI effect

Classic, Modern, Soft UI and Glass sign-out controls now have an adjacent chevron. The main control retains its local
Flow logout behavior. The menu explains the distinction and offers **Sign out of Workspace and all apps**. Workspace
then displays a confirmation card with global sign-out and cancellation actions.

## Configuration and deployment

No new environment variable, secret, migration or seed is required. Flow must retain:

```dotenv
NEXT_PUBLIC_WORKSPACE_URL="https://itf-workspace-staging.vercel.app"
NEXT_PUBLIC_WORKSPACE_LOGOUT_URL="https://itf-workspace-staging.vercel.app/dashboard/apps"
```

Deploy Workspace `453a0d3` before Flow `515e94c`, then exercise both exit scopes with a genuine Workspace-launched
Flow session.

## Verification

- Workspace: 68/68 tests pass; lint and production build pass; `/logout` appears in the route manifest.
- Flow: 30/30 security/contract tests pass; lint, typecheck and production build pass.
- New Flow cases verify separate destinations, the catalogue default and rejection of insecure/cross-origin deployed
  return URLs.

## Rollback

Redeploy both preceding commits together. No data rollback is required. Keep the corrected Flow-only return URL; it is
also safe for the earlier single-button behavior.

## Next action

Staging acceptance passed on 2026-09-08. Flow-only exit returned to the Workspace catalogue without ending the central
session; cancellation preserved the active sessions; confirmed global logout ended the current Workspace session and
its exact Flow session while preserving a separate Workspace device session. This also accepts A01-04.

Continue with A01-02 role-change/mismatch acceptance using a dedicated staging identity and approved old/new Flow
roles.
