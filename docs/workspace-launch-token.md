# Workspace Launch Token Contract

ITF Workspace app launches append a short-lived signed token to the registered app URL:

```text
workspace_launch_token=<payload>.<signature>
```

The receiving application must treat this as a launch handoff, not as a permanent session.

## Token Properties

- Version: `itf-workspace-launch-v1`
- Signature: HMAC-SHA256
- Default lifetime: 60 seconds
- Transport: query string during Workspace launch
- Secret: `WORKSPACE_LAUNCH_TOKEN_SECRET`

## Payload Shape

```ts
type WorkspaceLaunchTokenPayload = {
  version: "itf-workspace-launch-v1";
  tokenId: string;
  issuedAt: number;
  expiresAt: number;
  user: {
    id: string;
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
  app: {
    id: string;
    slug: string;
    name: string;
    role?: string | null;
  };
};
```

## Receiving App Responsibilities

1. Verify the token signature with the shared secret.
2. Reject expired tokens.
3. Confirm `app.slug` matches the receiving app.
4. Create the receiving app's own session.
5. Remove the token from the browser URL after successful exchange.
6. Log the token id and Workspace user id for audit correlation.

## URL Registry Rule

Register the exact reachable canonical host in Workspace. For example, if this works:

```text
https://itfpromotel.itf.gov.ng
```

do not register:

```text
https://www.itfpromotel.itf.gov.ng
```

unless the `www` DNS and hosting configuration are also active.
