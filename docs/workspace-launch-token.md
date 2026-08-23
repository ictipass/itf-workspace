# Workspace launch assertion v2 contract

Workspace launches an entitled child application by appending a short-lived, single-use JWS to its registered URL:

```text
workspace_launch_token=<protected-header>.<payload>.<signature>
```

This is a migration handoff, not an OAuth/OIDC access token and not the child application's session. The child app
must redeem it once, remove it from the visible URL through a redirect, and create its own revocable server-side
session. W04 adds immediate central logout and entitlement-revocation delivery for those child sessions.

## Protected header

```json
{
  "alg": "RS256",
  "typ": "itf-workspace-launch+jwt",
  "kid": "active-key-id"
}
```

Only RS256 is permitted. Production keys are governed by D07 and
[`2026-08-23-launch-assertion-key-management-policy.md`](policies/2026-08-23-launch-assertion-key-management-policy.md).
Workspace publishes public keys at `/api/integrations/workspace/v2/jwks`; private key material is never published.

## Payload

```ts
type WorkspaceLaunchV2Payload = {
  version: "itf-workspace-launch-v2";
  iss: string;
  sub: string; // immutable Workspace user ID
  aud: string; // stable child-app launch audience
  iat: number;
  nbf: number;
  exp: number;
  jti: string; // unique, single-use assertion ID
  identity: {
    name?: string | null;
    email?: string | null;
    staffNumber?: string | null;
    workspaceRole: string;
    officeId?: string | null;
    departmentId?: string | null;
    divisionId?: string | null;
    unitId?: string | null;
    positionId?: string | null;
  };
  entitlement: {
    appId: string;
    slug: string;
    role: string;
    requiredAssurance: "STANDARD" | "SENSITIVE";
  };
  authentication: {
    workspaceSessionId: string;
    methods: string[]; // pwd, and totp when sensitive
    authenticatedAt: number;
    mfaAuthenticatedAt?: number;
  };
};
```

The D06 defaults are a 120-second assertion lifetime and 30 seconds of clock-skew tolerance. `aud` is configured per
application and is independent of its URL. A receiver must check both `aud` and `entitlement.slug`.

## Assurance evaluation

Every active application and assignable child-app role has an explicit `STANDARD` or `SENSITIVE` classification. The
effective result is `SENSITIVE` when any of these is true:

- the application is sensitive;
- the assigned child-app role is sensitive;
- the Workspace user is `SYSTEM_ADMIN` or `APP_ADMIN`.

Standard launches require the Workspace password-authenticated session. Sensitive launches require TOTP enrollment
and a successful TOTP step-up within ten minutes. The stricter classification always wins and privileged Workspace
roles cannot be downgraded in settings.

## Receiver requirements

1. Permit only the documented algorithm/type and resolve `kid` from the trusted Workspace JWKS endpoint.
2. Verify the signature before trusting claims.
3. Validate the exact issuer, audience, app slug, timestamps, lifetime, immutable subject, role and authentication
   context.
4. For sensitive assertions, require method `totp` and validate its approved freshness.
5. Atomically create a unique redemption record for `jti`; reject an existing value.
6. Require an active locally provisioned user and exact recognized child-app role. Do not invent role mappings.
7. Redirect immediately after exchange so the assertion is removed from browser history and subsequent application
requests.
8. Avoid logging the assertion. Audit only non-secret correlation fields such as `jti`, `sub`, app ID and `kid`.

ITF Flow implements the first receiver in commit `f0696bc`. Its deployment variables and behavior are documented in
`itf-flow/docs/workspace-launch-v2.md`.

## Configuration

Workspace uses these values:

- `WORKSPACE_LAUNCH_ISSUER`
- `WORKSPACE_LAUNCH_SIGNER_PROVIDER` (`ephemeral`, `software`, or `kms`)
- `WORKSPACE_LAUNCH_ACTIVE_KID`
- `WORKSPACE_LAUNCH_PRIVATE_KEY_PEM_BASE64` for development/staging software signing only
- `WORKSPACE_LAUNCH_KMS_KEY_ID` for the production provider adapter
- `WORKSPACE_LAUNCH_ADDITIONAL_PUBLIC_JWKS_JSON` for normal rotation overlap
- `WORKSPACE_LAUNCH_TTL_SECONDS`, `WORKSPACE_LAUNCH_CLOCK_SKEW_SECONDS`, and `WORKSPACE_MFA_STEP_UP_SECONDS`
- `WORKSPACE_MFA_ENCRYPTION_KEY_BASE64`, which must decode to exactly 32 bytes

Production validation requires HTTPS, provider `kms`, an active key ID, a provider key reference, and an MFA
encryption key. The vendor-specific KMS/HSM adapter remains intentionally unavailable until ITF approves the provider;
production launch must remain blocked until that adapter and the launch checklist are completed.
