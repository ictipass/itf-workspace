# W40 — Single ordinary-staff creation

Status: **Implemented; staging acceptance pending**

Implementation commit: Workspace `c992230`.

## Practical effect and policy boundary

ICT can add one HR-confirmed staff member without creating a CSV. This is an alternative data-entry method under
D01/D36, not a new identity authority or privilege grant. HR remains authoritative and the administrator records the
HR source reference/confirmation. It cannot create non-staff, `APP_ADMIN` or `SYSTEM_ADMIN`, or grant child-app access.
Official-email domain eligibility remains an open configurable-policy item; no guessed domain restriction is added.

## Changes and visible UI

- **User Directory → Add Staff** opens `/dashboard/admin/users/new`.
- Form captures unique staff number, full name, official email, required active office, optional organization and
  supervisor references, and an HR source reference/confirmation. Parent changes clear dependent selections.
- Both page and submission require `SYSTEM_ADMIN`; live creation requires fresh TOTP. A verification link opens
  another tab so entered details remain available; the administrator must deliberately submit again afterward.
- Server ignores no authority-bearing input: attempts to supply Workspace or child-app roles are rejected.
- CSV and manual entry share `createWorkspaceStaff`: duplicate/reference/role checks, random temporary password,
  hashing, atomic identity/reporting-line write, audit, welcome email and mandatory first password replacement.
- Audit metadata identifies `SINGLE_USER` and the HR source reference. No temporary password reaches the action result.
- Welcome failures after commit return “created, delivery failed” rather than falsely implying rollback. CSV import
  also reports delivery-failure counts. There is still no durable retry/reissue workflow.

## Operator sequence

Follow the [staff onboarding runbook](../runbooks/staff-onboarding.md): add staff, confirm delivery/first login, grant
approved app access separately, then synchronize Flow-entitled staff before launch.

## Verification and acceptance

Four dedicated tests cover field normalization/leading zeroes, HR confirmation/source, injected privileges, actual
early rejection by the shared service, and server-side authorization/shared-service integration. Workspace regressions,
Prisma/configuration validation, TypeScript, lint, documentation validation (52 Markdown files) and production build
passed; 94 regression tests pass. The build includes the new staff route and complete Workbook runtime traces.

Staging checks after redeployment:

1. **Add Staff** is available to system admins, not ordinary staff; direct ordinary-staff access is rejected.
2. Create one HR-approved test record with a leading-zero staff number and valid organization references.
3. Invalid/duplicate records create no duplicate identities. Privileged fields cannot be injected into this action.
4. Expired ten-minute TOTP offers verification; resubmission succeeds only after fresh verification.
5. Confirm `USER_CREATED` audit `mode=SINGLE_USER` and HR reference, welcome email and first-password change.
6. Confirm no app entitlement was silently granted. Grant approved Flow role, synchronize and launch separately.
7. Controlled mail failure reports that creation committed; do not repeat creation or invent recovery credentials.

## Deployment and rollback

Redeploy Workspace. No migration, seed, new environment variable or secret. Existing welcome-email configuration is
reused. Rolling back application code removes the entry method, not users already created. Deactivate unwanted test
accounts through the approved existing workflow; never delete referenced identities.

W25 remains incomplete: durable delivery/reissue, temporary-password expiry, approved recovery, privileged grants and
HR lifecycle reconciliation are separate outstanding work. Manual entry does not close those gates.
