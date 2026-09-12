# ITF Workspace environment configuration reference

## Rules

- `.env.example` is the current variable template. `.env.example-workspace` is legacy and must not drive deployment.
- Prefer `AUTH_*` names. `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are compatibility aliases; never configure conflicting
  values for both aliases.
- Vercel variables must be scoped to the intended project/environment and require redeployment after change.
- Development, staging and production use different databases, secrets and signing keys.
- All deployed URLs are absolute HTTPS URLs.
- Do not commit `.env` files or expose values in logs/screenshots.

Run `npm run config:check`, `config:check:staging` or `config:check:production` as appropriate.

## Core runtime and authentication

| Variable | Secret | Requirement and accepted value |
|---|---|---|
| `DATABASE_URL` | Yes | Required PostgreSQL `postgres:`/`postgresql:` URL; use provider-approved pooling for runtime and verified TLS |
| `WORKSPACE_DEPLOYMENT_STAGE` | No | `development`, `test`, `staging` or `production`; required on Vercel and must match Vercel environment |
| `AUTH_SECRET` | Yes | Preferred Auth.js signing secret, at least 32 non-placeholder characters when deployed |
| `AUTH_URL` | No | Preferred absolute Workspace origin; HTTPS when deployed |
| `AUTH_TRUST_HOST` | No | Optional `true`, `false`, `1` or `0`; enable only for approved proxy topology |
| `WORKSPACE_SERVER_ACTION_ALLOWED_ORIGINS` | No | Optional comma-separated exact `host[:port]`; no schemes, paths, credentials or wildcards |
| `APP_LOGIN_URL` | No | Optional explicit welcome-email login URL; otherwise derived from Auth URL |

Compatibility aliases: `NEXTAUTH_SECRET` for `AUTH_SECRET`, and `NEXTAUTH_URL` for `AUTH_URL`. Use one naming family,
preferably `AUTH_*`.

## Session and MFA policy

| Variable | Secret | Default | Allowed range/effect |
|---|---|---:|---|
| `WORKSPACE_STAFF_IDLE_TIMEOUT_SECONDS` | No | 1200 | 300–7200 |
| `WORKSPACE_PRIVILEGED_IDLE_TIMEOUT_SECONDS` | No | 600 | 300–3600 |
| `WORKSPACE_SESSION_WARNING_SECONDS` | No | 120 | 30–600 and shorter than both idle limits |
| `WORKSPACE_ABSOLUTE_TIMEOUT_SECONDS` | No | 10800 | 1800–86400 and longer than both idle limits |
| `WORKSPACE_MAX_CONCURRENT_SESSIONS` | No | 2 | 1–10 |
| `WORKSPACE_SESSION_RECOVERY_TTL_SECONDS` | No | 300 | 60–900 |
| `WORKSPACE_MFA_STEP_UP_SECONDS` | No | 600 | 60–3600 |
| `WORKSPACE_MFA_ENCRYPTION_KEY_BASE64` | Yes | none | Required when deployed; Base64 that decodes to exactly 32 random bytes |

The defaults reflect D02-D05. Changing them requires policy approval, not only an environment edit.

## Email delivery

| Variable | Secret | Requirement |
|---|---|---|
| `RESEND_API_KEY` | Yes | Provider-issued Resend API credential; required when deployed |
| `RESEND_FROM_EMAIL` | No | Approved sender in `Name <address>` form; domain must be authorized with provider |

`RESEND_API_KEY` cannot be generated with a local random-byte command because the provider must issue it.

## Launch signing and assertion

| Variable | Secret | Requirement |
|---|---|---|
| `WORKSPACE_LAUNCH_ISSUER` | No | Exact Workspace origin; HTTPS in staging/production |
| `WORKSPACE_LAUNCH_SIGNER_PROVIDER` | No | `ephemeral` development only; `software` or `kms` staging; production must be `kms` |
| `WORKSPACE_LAUNCH_ACTIVE_KID` | No | Stable unique public key identifier for software/KMS signers |
| `WORKSPACE_LAUNCH_PRIVATE_KEY_PEM_BASE64` | Yes | Base64 PKCS#8 RSA private PEM for staging software signer; prohibited in production |
| `WORKSPACE_LAUNCH_KMS_KEY_ID` | Sensitive identifier | Required for `kms`; issued by the selected KMS/HSM, not locally generated |
| `WORKSPACE_LAUNCH_ADDITIONAL_PUBLIC_JWKS_JSON` | No | Optional public-only JWK Set for rotation overlap; private members prohibited |
| `WORKSPACE_LAUNCH_TTL_SECONDS` | No | Default 120; allowed 30–300 |
| `WORKSPACE_LAUNCH_CLOCK_SKEW_SECONDS` | No | Default 30; allowed 0–60 |

The current code deliberately throws when asked to sign with KMS because the provider adapter is not yet implemented.
Setting KMS variables alone does not make production launch operational.

## ITF Flow integration

| Variable | Secret | Default/requirement |
|---|---|---|
| `ITF_FLOW_URL` | No | Flow launch URL; HTTPS when deployed |
| `ITF_FLOW_DIRECTORY_SYNC_URL` | No | Optional explicit directory endpoint; otherwise derived from Flow URL |
| `ITF_FLOW_SESSION_EVENTS_URL` | No | Optional explicit event endpoint; otherwise derived from Flow URL |
| `ITF_FLOW_APP_SLUG` | No | Default `itf-flow`; lowercase letters/numbers/hyphens, 2–64 characters |
| `WORKSPACE_DIRECTORY_SYNC_SECRET` | Yes | Independent shared bearer secret matching Flow directory receiver |
| `ITF_FLOW_APP_NAVIGATION_SECRET` | Yes | Independent credential matching Flow navigation client |
| `WORKSPACE_INTEROP_SECRET` | Yes | Independent credential matching Flow session-event receiver |
| `WORKSPACE_OUTBOX_WORKER_SECRET` | Yes | Independent credential protecting the retry-worker route |
| `WORKSPACE_DIRECTORY_SYNC_BATCH_SIZE` | No | Default 200; allowed 1–500 |
| `WORKSPACE_DIRECTORY_SYNC_TIMEOUT_MS` | No | Default 30000; allowed 1000–120000 |
| `WORKSPACE_OUTBOX_REQUEST_TIMEOUT_MS` | No | Default 3000; allowed 500–15000 |
| `WORKSPACE_OUTBOX_BATCH_SIZE` | No | Default 20; allowed 1–100 |
| `WORKSPACE_OUTBOX_MAX_ATTEMPTS` | No | Default 10; allowed 1–50 |
| `WORKSPACE_OUTBOX_RETRY_BASE_SECONDS` | No | Default 30; allowed 1–3600 |
| `WORKSPACE_OUTBOX_RETRY_MAX_SECONDS` | No | Default 3600; allowed 30–86400 and not below base |
| `WORKSPACE_OUTBOX_LEASE_SECONDS` | No | Default 30; allowed 10–300 |

The four secrets serve different trust purposes and must not reuse a value. Flow integration configuration is
currently app-specific and will be replaced by W17's generic connector registry.

## Organization import

| Variable | Secret | Default | Allowed range |
|---|---|---:|---|
| `WORKSPACE_ORG_IMPORT_MAX_FILE_BYTES` | No | 5242880 | 65,536–20,971,520 |
| `WORKSPACE_ORG_IMPORT_MAX_ROWS_PER_SHEET` | No | 1000 | 1–5000 |
| `WORKSPACE_ORG_IMPORT_VALIDATION_RECEIPT_SECONDS` | No | 600 | 60–1800 |

The existing Auth secret signs validation receipts; no separate organization-import secret exists.

## Initial administration and seeds

| Variable | Secret | Use |
|---|---|---|
| `INITIAL_ADMIN_EMAIL` | Personal/config | Development seed only; not retained in deployed runtime |
| `INITIAL_ADMIN_PASSWORD` | Yes | Development seed only; prohibited as a production default |
| `INITIAL_ADMIN_NAME` | Personal/config | Development seed only |
| `INITIAL_ADMIN_STAFF_NUMBER` | Personal/config | Development seed only |
| `WORKSPACE_BOOTSTRAP_TRANSACTION_MAX_WAIT_MS` | No | Optional staging bootstrap transaction wait; default 15000 |
| `WORKSPACE_BOOTSTRAP_TRANSACTION_TIMEOUT_MS` | No | Optional staging bootstrap transaction timeout; default 30000 |

Use the controlled staging bootstrap command only for the first administrator. Do not store bootstrap identity/password
values in Vercel runtime variables and do not run the general development seed to alter deployed policy.

## Secret and key generation

Generate a 32-byte opaque secret as 64 hexadecimal characters for Auth.js and independent shared integration secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate the MFA encryption key in Base64 because that variable must decode to exactly 32 bytes:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Generate a 3072-bit staging RSA PKCS#8 private key with OpenSSL:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out workspace-launch-private.pem
node -e "console.log(require('fs').readFileSync('workspace-launch-private.pem').toString('base64'))"
```

Store only the Base64 output in the staging secret manager, restrict and securely destroy the temporary PEM after
verification according to ITF key handling. Do not use this software key in production.

Production KMS/HSM key material is generated inside the selected external provider as non-exportable RSA 3072-bit
material. The provider supplies the key identifier used by `WORKSPACE_LAUNCH_KMS_KEY_ID`; a random-byte command cannot
generate that provider identifier or managed key.

Database credentials and Resend keys are provider-issued. Never replace them with locally generated random strings.
