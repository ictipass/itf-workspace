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

## Reusable Receiver Helper

This Workspace repo includes a reusable receiver-side helper at:

```text
lib/integrations/workspace-launch-token-receiver.ts
```

Future ITF business apps can copy that file into their own `lib/integrations/`
folder. It intentionally requires an explicit secret and expected app slug so a
receiving app cannot accidentally trust a token issued for another application.

## Next.js Receiving Route Pattern

A business app should expose a launch route that receives the token, verifies it,
creates an app-local session, and redirects to the internal dashboard.

Example for a future Client Reimbursement App:

```ts
// app/workspace/launch/route.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getWorkspaceLaunchTokenFromUrl,
  removeWorkspaceLaunchTokenFromUrl,
  verifyWorkspaceLaunchTokenForApp,
} from "@/lib/integrations/workspace-launch-token-receiver";

const APP_SLUG = "client-reimbursement";

export async function GET(request: Request) {
  const token = getWorkspaceLaunchTokenFromUrl(request.url);

  if (!token) {
    redirect("/login");
  }

  const payload = verifyWorkspaceLaunchTokenForApp(token, {
    secret: process.env.WORKSPACE_LAUNCH_TOKEN_SECRET!,
    expectedAppSlug: APP_SLUG,
  });

  // Upsert or locate the receiving app's local user record here.
  // Store only the identifiers and role context this app needs.
  const sessionValue = JSON.stringify({
    workspaceUserId: payload.user.id,
    email: payload.user.email,
    name: payload.user.name,
    staffNumber: payload.user.staffNumber,
    appRole: payload.app.role,
    tokenId: payload.tokenId,
  });

  const cookieStore = await cookies();
  cookieStore.set("client_reimbursement_session", sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  // Useful when launch URLs contain app-specific destination parameters.
  removeWorkspaceLaunchTokenFromUrl(request.url);

  redirect("/dashboard");
}
```

In a production receiving app, replace the JSON cookie example with the app's
real session store. The key idea is that the Workspace launch token is exchanged
once, then removed from the visible URL.

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
