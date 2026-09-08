# Child-application navigation directive

Approval status: Approved interim ITF policy  
Approving authority: Super administrator  
Effective date: 2026-09-08  
Reference: Project architecture directive follow-up

## Approved outcome

1. Workspace remains the complete application registry. Its catalogue may show every registered application and must
   visibly disable applications the current user is not authorized to launch.
2. A switcher embedded in a child application displays only other active applications for which the current user has
   an active entitlement and an active matching child-app role policy.
3. A normal selection replaces the current browser tab. Native browser behavior for opening a link in a new tab or
   window remains available.
4. A child app must not construct a direct authenticated entry into another child app. Each selection returns through
   the target application's Workspace launch route, where Workspace revalidates the current session, entitlement and
   applicable MFA classification.
5. A child app may request navigation only for a session originally launched by Workspace. It must use a dedicated,
   environment-specific server credential that is not exposed to the browser and is not reused for directory sync,
   revocation delivery or signing.
6. Navigation responses are private, non-cacheable and fail closed when Workspace, the current central session or the
   integration credential cannot be validated.

## Operational boundary

This directive does not change logout policy. Signing out within a child application currently ends that child-app
session only. Any future user-facing option to sign out from every ITF application requires a separately approved
central-logout user-experience decision and implementation slice.

Future non-staff identity support, group-derived access and dynamic connector registration remain governed by their
separate policy and architecture decisions.
