# ITF Flow OFFICER assurance directive

Status: **Approved interim policy**

Effective date: **2026-09-12**

Approving authority: **Super administrator**

Decision register: **D42**

## Decision

The exact ITF Flow child-application role code `OFFICER` is classified `STANDARD`.

Workspace may enable launch for an active `OFFICER` entitlement only when this role policy is active in the ITF Flow
registry record. The application-level assurance classification and D05's more-restrictive-wins rule remain in force;
therefore a `SENSITIVE` ITF Flow application classification would still require TOTP for `OFFICER` users.

## Scope and exclusions

- This decision applies only to the exact `OFFICER` role in ITF Flow.
- It does not classify any other current or future Flow role.
- It does not grant the role to any user; entitlement remains a separate controlled action.
- It does not bypass directory synchronization or Flow's own authorization checks.
- Changing this role to `SENSITIVE` requires a later recorded approval and must trigger the established assurance
  increase/session-revocation behavior.

## Operational requirement

ICT must configure `OFFICER` as `STANDARD` under **Administration > Apps > ITF Flow > Child-app role assurance** in
each environment before importing or synchronizing users assigned that role. Clean development seeds may establish
the same policy for repeatability; deployed registry records remain administrator-managed and audited.
