# Flow handoff troubleshooting

## Safe diagnosis

Use a fresh **My Apps → ITF Flow → Launch App** attempt. Never paste the launch URL, token, QR secret, temporary
password or database URL into logs/tickets/chat. An `invalid-token` URL alone cannot distinguish a signature failure
from provisioning or database failures.

On a deployed W39 Flow release, collect the login page's UUID support reference and time. In the **Flow** Vercel
project's runtime logs find `workspace_launch_failed` with that reference. The record contains `stage` and `code`;
the browser intentionally does not disclose the detailed rejection reason.

| Code | Meaning and action |
|---|---|
| `USER_NOT_PROVISIONED` | Confirm central account and Flow entitlement are active/approved; run **Bulk Import Users → Synchronize entitled staff to ITF Flow**; retry |
| `USER_INACTIVE` | Flow identity is disabled, possibly after revocation/role/assurance acceptance; confirm access restoration is approved, check pending revocations, then synchronize; never blindly activate it |
| `ROLE_MISMATCH` | Flow's provisioned role differs from central entitlement; verify approved exact role and synchronize |
| `IDENTITY_CONFLICT` | Immutable ID and email resolve to different identities; escalate reconciliation, do not merge/relink by hand |
| `ROLE_UNSUPPORTED` | Registry role is not implemented by Flow; use an approved Flow-supported role, not a source-code fallback |
| `SIGNING_KEY_UNKNOWN` | Check active signing `kid` is in public JWKS and the configured URL is the correct environment |
| `SIGNATURE_INVALID` | Verify deployed signer/public-key pairing; rotation must use a new `kid`; do not share private keys or disable verification |
| `CLAIMS_INVALID` | Compare normalized issuer, registry launch audience, Flow audience, registry slug and Flow slug; recheck contract versions |
| `TIMING_INVALID` | Start fresh, verify clocks and central session is live; retain approved 120-second lifetime/30-second skew |
| `ASSURANCE_REQUIRED` | Complete fresh TOTP for sensitive app/role; do not downgrade its classification to force entry |
| `TOKEN_REPLAYED` | Assertion was already consumed; launch again from Workspace instead of refreshing/reusing the handoff URL |
| `DATABASE_UNAVAILABLE` | Check Flow database reachability, pooling, migrations and transaction pressure; public readiness alone does not exercise the launch transaction |
| `RECEIVER_CONFIGURATION_INVALID` | Check Flow's exact deployed launch receiver variables/environment scope and redeploy |
| `JWKS_UNAVAILABLE`, `JWKS_RESPONSE_INVALID`, `TOKEN_VERIFICATION_FAILED` | Check Flow-to-Workspace fetch, HTTPS, public JSON/JWKS response and configuration; escalate unresolved fetch/parser errors with the reference |
| `SESSION_CREATION_FAILED`, `PROVISIONING_FAILED` | Check Flow migrations, `SESSION_SECRET`, database runtime/transaction behavior; diagnose with reference, do not bypass checks |
| `TOKEN_MALFORMED`, `HEADER_INVALID` | Retry from Workspace and confirm current v2 receiver/issuer deployment; never fabricate a token |

Directory synchronization is a state-changing administrator action affecting all active Flow entitlements. Review
approvals and outstanding revocation delivery before using it. A still-pending old revocation can disable a restored
identity later; ordered/versioned lifecycle delivery remains future W18 work.

## Read-only preflight (Command Prompt)

From the Workspace repository, when both local env files point to the intended staging resources:

```cmd
npm run integration:check-flow -- --flow-env=../itf-flow/.env
```

This command reads `.env` in Workspace and the explicitly supplied Flow env file. It reports only boolean/configuration
matches and counts, exits non-zero on mismatches/unavailable checks, and performs no user/synchronization writes.
Undelivered outbox counts are reported for investigation; their presence alone does not change the exit code.
Local file comparisons do not establish Vercel's actual deployed configuration. Never replace production secrets or
reseed a staging database to work around a failed preflight. A provider-accepted email is not proof of inbox delivery.
