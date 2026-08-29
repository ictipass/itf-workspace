# Vercel deployment environments

## Confirmed topology

Recorded 2026-08-29 from the super administrator's deployment report:

- Workspace is hosted on Vercel.
- Staging is a Vercel Preview deployment tied to the `staging` branch.
- `itf-workspace-staging.vercel.app` is the branch's stable custom domain.
- The intended production domain is `itf-workspace.vercel.app`.

This is partial D13 evidence. Production proxy/TLS ownership, deployment protection, regions, operational access and
the external KMS/OIDC topology still require approval.

## Environment identity

Next.js sets `NODE_ENV=production` for optimized Preview and Production builds. Workspace therefore uses the separate,
server-only `WORKSPACE_DEPLOYMENT_STAGE` setting for organizational security policy.

Configure it as a branch-specific Preview variable for the `staging` branch:

```env
WORKSPACE_DEPLOYMENT_STAGE="staging"
```

Configure the Production target separately:

```env
WORKSPACE_DEPLOYMENT_STAGE="production"
```

Do not override `NODE_ENV`. When Vercel system environment variables are exposed, Workspace rejects a Preview marked
as production and a Vercel Production deployment marked as anything other than production. A Vercel deployment without
an explicit Workspace stage fails closed.

## Staging URL and signing profile

The staging branch requires absolute HTTPS URLs:

```env
AUTH_URL="https://itf-workspace-staging.vercel.app"
APP_LOGIN_URL="https://itf-workspace-staging.vercel.app/login"
WORKSPACE_LAUNCH_ISSUER="https://itf-workspace-staging.vercel.app"
```

Bare hostnames such as `itf-workspace-staging.vercel.app` are not absolute URLs. Every ITF Flow URL must likewise
include `https://`.

Use stable software signing for staging:

```env
WORKSPACE_LAUNCH_SIGNER_PROVIDER="software"
WORKSPACE_LAUNCH_ACTIVE_KID="workspace-staging-YYYY-MM"
WORKSPACE_LAUNCH_PRIVATE_KEY_PEM_BASE64="<staging-only PKCS#8 RSA-3072 private key>"
WORKSPACE_LAUNCH_KMS_KEY_ID=""
```

Store the private key as a Vercel Sensitive Environment Variable scoped to the staging branch. Never reuse it in
development or production. Ephemeral signing is prohibited in staging because separate serverless instances or
restarts could expose inconsistent signing/JWKS keys.

Production keeps `WORKSPACE_LAUNCH_PRIVATE_KEY_PEM_BASE64` empty and requires the approved external KMS key reference.
Production launch remains blocked until the Vercel OIDC/external-KMS adapter is implemented and approved.

## Deployment procedure

1. Scope all staging credentials and URLs to Preview plus the `staging` branch; do not grant them to every preview
   branch.
2. Enable Vercel system environment variables so Workspace can compare `VERCEL_ENV` with its declared stage.
3. Mark the staging software private key, Auth secret, MFA encryption key, database URL, email key and integration
   credentials Sensitive.
4. Validate the branch-scoped environment before deployment:

   ```powershell
   vercel env run -e preview --git-branch staging -- npm run config:check:staging
   ```

5. Redeploy the staging branch after any environment-variable change; existing deployments do not receive new values.
6. Confirm `/login`, the public JWKS endpoint and ITF Flow connectivity before starting the A01 lifecycle exercise.

No wildcard proxy origin is approved. `WORKSPACE_SERVER_ACTION_ALLOWED_ORIGINS` should remain empty when the browser
origin and forwarded host are both the stable staging domain; add only an exact `host[:port]` if deployment evidence
shows a controlled mismatch.

## Failure interpretation

Vercel may mark a deployment Ready after a successful build while the first request returns 500. Workspace intentionally
validates injected secrets and runtime environment in its instrumentation hook. A runtime configuration failure is a
fail-closed deployment, not proof that the settings used during the build were valid.
