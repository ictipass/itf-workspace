# W07 - Secure configuration validation

## Business outcome

Workspace now fails with a clear, redacted configuration error before a production server accepts requests when a
required security setting is absent, malformed, contradictory or still contains a documented placeholder. Local
development remains usable without silently carrying its fallback credentials into production.

## Scope implemented

- Centralized server configuration parsing and validation in `lib/config/workspace-environment.ts`.
- Added Next.js startup validation through root `instrumentation.ts`; production-build validation is intentionally
  skipped there so one build artifact can receive secrets at runtime.
- Added `npm run config:check` and `npm run config:check:production` deployment checks. Output reports configuration
  state but never secret values.
- Restricted the version-1 launch-token fallback secret to development and test; production requires a non-placeholder
  secret containing at least 32 characters.
- Replaced direct Resend, welcome-email, ITF Flow directory-sync, Prisma runtime and Prisma CLI configuration access
  with validated configuration consumers.
- Removed production welcome-email sender/login defaults. The login URL may be explicitly configured or safely derived
  from the configured Auth.js URL.
- Removed all production initial-administrator seed defaults, made its staff number configurable, and stopped printing
  the production seed password.
- Updated `.env.example` with every currently supported variable and Auth.js's preferred names while retaining validated
  compatibility with `NEXTAUTH_SECRET` and `NEXTAUTH_URL`.

## Configuration contract

| Setting | Development/test | Production behavior |
|---|---|---|
| `DATABASE_URL` | Required PostgreSQL URL | Required PostgreSQL URL |
| `AUTH_SECRET` or `NEXTAUTH_SECRET` | Optional framework development behavior; aliases must agree | Required, at least 32 characters, no documented placeholder |
| `AUTH_URL` or `NEXTAUTH_URL` | Optional; validated when set | Required; aliases must agree |
| `AUTH_TRUST_HOST` | Optional boolean value | Optional boolean value pending D13 topology approval |
| Launch signing (superseded by W03) | The former development v1 secret was permitted | W03 removed the shared launch secret and requires RS256/JWKS with a production KMS/HSM provider |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Optional, but required together when email is configured or invoked | Required before server startup |
| `APP_LOGIN_URL` | Optional; defaults locally or derives from Auth.js URL | Optional when derivable from Auth.js URL |
| `ITF_FLOW_URL` or `ITF_FLOW_DIRECTORY_SYNC_URL` | Optional; directory sync still requires a matching secret when invoked | If any ITF Flow sync setting is present, endpoint and secret must form a complete configuration |
| `WORKSPACE_DIRECTORY_SYNC_SECRET` | Required when directory sync is invoked | Required when ITF Flow sync is configured, at least 32 characters |
| `INITIAL_ADMIN_*` and seed `ITF_FLOW_URL` | Explicit values or documented local defaults | All required when the seed command is invoked; placeholder passwords are rejected |

The validator checks URL syntax and supported protocols but does not select permitted domains, internal networks, TLS
termination or proxy trust. Those remain governed by D12-D13 and W06/W09. It also does not select the W03 signing
model, custody or rotation policy governed by D07. W03 subsequently implemented the approved model and supersedes the
launch-signing row above.

## Regression coverage

W07 added 11 tests covering:

- development-only fallback isolation;
- valid and missing production configuration;
- redacted aggregate errors;
- conflicting Auth.js aliases;
- production placeholder-secret rejection;
- PostgreSQL URL and trust-host validation;
- email pairing and login-URL derivation;
- ITF Flow endpoint derivation and sync-secret enforcement;
- local seed usability and removal of production seed defaults.

The complete W08 security suite now contains 25 passing tests across 6 suites.

## Verification

- `npm.cmd run verify`: passed (`config:check`, Prisma validation, 25 security tests, ESLint and production build).
- Next.js production build: passed TypeScript and all 17 routes.
- Runtime smoke test: development server started with validation active and `/login` returned HTTP 200.
- `git diff --check`: passed; only Git's existing LF-to-CRLF working-copy notices were emitted.

Implementation commit: `2caeede`.

## Data, operational and UI effects

- Database migration: none.
- New configuration: `AUTH_SECRET`/`AUTH_URL` preferred aliases, `ITF_FLOW_DIRECTORY_SYNC_URL` and
  `INITIAL_ADMIN_STAFF_NUMBER` are documented; existing legacy Auth.js aliases remain supported.
- Current local environment: valid for development; ITF Flow directory sync is not fully configured locally because
  the matching sync secret is absent. No secret value was read into documentation or logs.
- Deployment effect: inject production secrets at runtime and run `npm run config:check:production` before starting the
  service. Development, staging and production must use separate credentials before Gate A is satisfied.
- Runtime UI: no visible change. Invalid production configuration prevents startup instead of failing later during a
  user operation.

## Rollback

Revert `2caeede`. No data rollback is required. Reverting restores production fallback and late-failure risks and must
not be used to bypass a failed deployment configuration check.
