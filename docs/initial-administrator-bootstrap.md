# Controlled initial administrator bootstrap

## Purpose and boundary

`npm run db:bootstrap-admin` creates the first Workspace `SYSTEM_ADMIN` in an empty staging database without seeding
ITF Flow or retaining a privileged temporary password in Vercel runtime configuration. It is a one-time bootstrap
operation, not the general privileged-role grant workflow.

The operation is deliberately limited to `WORKSPACE_DEPLOYMENT_STAGE=staging`. Production bootstrap requires a
separate approved operational procedure after production secret custody, KMS signing and change-control gates are met.

Implementation commits: initial bootstrap `37feab7`; remote transaction/input hardening `2463277`; Prisma advisory-lock
deserialization correction `79aac76`.

## Security behavior

- Administrator email, full name and staff number are explicit command arguments; no identity is hard-coded.
- Backslashes are rejected in bootstrap email input so shell/Markdown escaping cannot silently alter the identity.
- The staff number remains a string, preserving leading zeroes.
- A cryptographically random temporary password is generated internally, hashed with bcrypt and never printed or
  returned by the command.
- The account is first persisted as `INACTIVE` under a transaction-scoped PostgreSQL advisory lock.
- The advisory-lock query casts PostgreSQL's `void` result to a supported text value before Prisma deserializes it.
- The account becomes `ACTIVE` only after the approved email provider accepts the welcome message.
- If delivery fails, the pending account remains inactive. An exact rerun replaces the undelivered credential before
  retrying delivery; it cannot silently change the pending identity.
- An existing active/suspended administrator, multiple administrator records, or an email/staff-number collision causes
  the operation to fail closed.
- Creation, delivery retry and activation state transitions produce audit records without credential material.
- Successful login still requires replacement of the temporary password followed by mandatory privileged TOTP
  enrollment.

## One-time staging inputs

Do not add `INITIAL_ADMIN_*` variables to Vercel and do not place bootstrap in the Vercel Build Command. Create a local,
ignored `.env.staging.bootstrap` file containing only the staging service configuration needed by this command:

```dotenv
DATABASE_URL="<remote-staging-postgresql-url>"
WORKSPACE_DEPLOYMENT_STAGE="staging"
RESEND_API_KEY="<staging-resend-api-key>"
RESEND_FROM_EMAIL="<approved-and-verified-sender>"
AUTH_URL="https://itf-workspace-staging.vercel.app"
# Optional bounded overrides; defaults shown.
WORKSPACE_BOOTSTRAP_TRANSACTION_MAX_WAIT_MS="15000"
WORKSPACE_BOOTSTRAP_TRANSACTION_TIMEOUT_MS="30000"
```

The repository's `.env*` rule ignores this temporary file. It must not contain unrelated credentials such as source
control tokens.

The remote-database acquisition and transaction durations accept integer values from 1,000 through 120,000
milliseconds. The 15-second/30-second defaults accommodate a cold staging TLS connection without allowing an
unbounded bootstrap process.

From the Workspace repository, select that file for this process and supply the approved identity explicitly:

```powershell
$env:DOTENV_CONFIG_PATH = ".env.staging.bootstrap"
npm.cmd run db:bootstrap-admin -- --email "administrator@itf.gov.ng" --full-name "Approved Administrator" --staff-number "00000"
Remove-Item Env:DOTENV_CONFIG_PATH
```

On success, securely remove `.env.staging.bootstrap`, confirm that the official mailbox received the message, and test
temporary-password replacement and TOTP enrollment. Never rerun the command after activation; it will refuse to modify
an existing administrator.

Command Prompt does not use backslashes to escape `_` or `@`. Type `DOTENV_CONFIG_PATH` and the email address exactly;
for example, `administrator@itf.gov.ng`, never `administrator\@itf.gov.ng`.

## Failure and recovery

- Configuration failure occurs before any database record is created.
- Email-delivery failure leaves the exact pending record inactive. Correct the provider configuration and rerun the
  exact same identity command.
- Activation failure occurs after the provider accepted the message but leaves the record inactive. Rerunning issues a
  replacement temporary credential, sends a new message and retries activation.
- Identity mismatch, an existing administrator, or existing email/staff-number ownership requires investigation rather
  than a bypass or direct database edit.

## Data, integration and UI effects

- Database migration: none; the existing User and AuditLog models are used.
- ITF Flow registry/access: none.
- Vercel runtime variables: none added.
- Visible UI: none until the new administrator signs in; the existing change-password and TOTP enrollment screens then
  enforce the approved first-login sequence.
