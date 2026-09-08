# Session exit-scope directive

Approval status: Approved interim ITF policy  
Approving authority: Super administrator  
Effective date: 2026-09-08  
Reference: Project architecture directive follow-up

## Approved outcome

1. A child application's primary sign-out action terminates only the current session in that child app and returns the
   browser to Workspace's application catalogue. The Workspace session remains active.
2. The child-app sign-out control has an adjacent chevron menu containing **Sign out of Workspace and all apps**.
3. Selecting the global option transfers control to Workspace without first ending the child session. Workspace shows
   a confirmation page; cancellation returns to the application catalogue without revoking a session.
4. Confirmation revokes the current Workspace session, clears its Workspace authentication and sends central logout
   instructions to every connected child app for sessions bound to that Workspace session.
5. Global logout does not terminate the user's other Workspace sessions on other browsers or devices. The existing
   **End all sessions** function remains the explicit control for that wider scope.
6. The application switcher remains the normal method for moving to another eligible application without ending the
   current child-app session.
7. A state-changing logout must require a POST-backed confirmation and must not be performed by an unauthenticated GET
   request. Central-delivery failure must leave the Workspace session revoked and retain retryable outbox evidence.

## Integration boundary

"All apps" means all Workspace-connected applications that implement the approved central logout contract. Every new
child app must satisfy that contract before activation. At the date of approval, ITF Flow is the first connected child
app. Applications outside Workspace governance cannot be claimed as centrally terminated.
