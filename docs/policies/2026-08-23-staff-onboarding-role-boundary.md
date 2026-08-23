# ITF staff onboarding role-boundary directive

Effective date: 2026-08-23

Approving authority: Super administrator

Status: Approved interim project architecture directive

## Approved rule

The HR-supplied authoritative master list may create ordinary Workspace staff accounts only. Every imported row must
use Workspace role `STAFF`.

The HR file must not grant `APP_ADMIN` or `SYSTEM_ADMIN`. Privileged Workspace roles are granted separately by an
approved super administrator through a governed, freshly authenticated and audited process. A syntactically valid
privileged role in an HR file is rejected; it is not silently downgraded.

This rule governs Workspace roles only. Child-application role ownership and approval remain subject to D15 and D22.
It does not authorize an HR spreadsheet to bypass a child application's role or assurance policy.

## Operational boundary

- HR remains authoritative for staff identity and organization placement under D01.
- ICT administers the import, performs a dry run and corrects every rejected row before creation.
- Actual import requires a fresh TOTP-authenticated super-administrator session because it creates identities and may
  grant child-app access. A validation-only dry run does not change state.
- The initial bootstrap super administrator is outside the HR bulk-import path.
- Workspace must provide a separate privileged-role administration capability before routine privileged grants are
  operational. Direct database edits are not an approved role-grant workflow.

## Change control

Any future permission for HR data to grant a privileged Workspace role requires a dated replacement decision,
segregation-of-duties review, affected-account remediation plan and corresponding server-side code change.
