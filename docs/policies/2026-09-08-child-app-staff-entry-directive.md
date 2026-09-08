# Child-application staff-entry directive

Approval status: Approved interim ITF policy  
Approving authority: Super administrator  
Effective date: 2026-09-08  
Reference: Project architecture directive follow-up

## Approved outcome

1. A deployed child app without an approved independent staff-login mechanism must not present a dead-end staff login
   page. Its public landing page and staff-access route provide a clear link to ITF Workspace login.
2. The Workspace login URL is derived from the child's validated, environment-specific Workspace origin. A production
   child must require HTTPS and must not use a hard-coded staging, production or developer hostname.
3. After Workspace authentication, staff use the Workspace catalogue and entitlement-aware launch path. The child does
   not accept Workspace credentials directly and does not imitate the Workspace login form.
4. A child app may retain local staff credentials only in an explicitly enabled development/demo environment under
   its existing policy. This exception does not authorize deployed staging or production local staff login.
5. External stakeholder/client login is a separate identity boundary and must not be redirected into the staff
   Workspace flow unless a future non-staff identity policy explicitly authorizes it.
