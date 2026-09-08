# W29 - Child-app staff entry through Workspace

ITF Flow implementation commit: `8ff3202`

## Outcome

Staff who arrive directly at Flow's public landing page or `/login` route now receive a prominent, working path to
Workspace login. Flow remains unable to collect production staff passwords, and stakeholder portal/submission paths
remain separate.

## Implementation and security

- The landing page displays **Staff sign in through Workspace** and retains a separate staff-access help route.
- The staff-login page always displays **Continue to ITF Workspace**. Local login fields appear only when the existing
  `STAFF_LOCAL_LOGIN_ENABLED` development/demo policy permits them.
- The login URL is derived from `NEXT_PUBLIC_WORKSPACE_URL` by the shared validated Workspace URL resolver. Production
  requires HTTPS, so no additional hostname or environment variable can drift from navigation/logout trust.
- Workspace remains responsible for authentication, application entitlement and the signed one-time Flow launch.

## Visible UI effect

Two public Flow pages gain direct Workspace calls to action. There is no Workspace UI change.

## Verification

- Flow security/contract tests: 30/30 pass.
- Flow lint, sequential typecheck and production build pass.
- No migration, seed, secret or new environment variable is required.

## Deployment and acceptance

Deploy Flow `8ff3202` after or with the existing W28/S23B deployment. In a private browser, open `/` and `/login`, use
each Workspace link, authenticate if required and confirm the user can choose/launch only entitled applications.

## Next action and practical use

After W28/W29 staging acceptance, continue A01 lifecycle acceptance. Its practical purpose is to prove the complete
security lifecycle rather than only the successful launch: a one-time assertion cannot be replayed; role or assurance
changes force the correct new authorization; central logout and entitlement revocation end existing access; duplicate
events are harmless; and a temporary receiver outage leaves durable retry evidence and eventually converges.
