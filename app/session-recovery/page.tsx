import { redirect } from "next/navigation";
import { getSessionRecoveryCookie } from "@/lib/auth/session-recovery-cookie";
import { getSessionRecoveryContext } from "@/lib/auth/workspace-session.service";
import { recoverSessionAction } from "./actions";

const formatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

export default async function SessionRecoveryPage() {
  const token = await getSessionRecoveryCookie();
  const context = token ? await getSessionRecoveryContext(token) : null;
  if (!context) redirect("/login?reason=recoveryExpired");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Session limit reached</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {context.user.fullName}, ITF policy permits two active Workspace sessions. End one
          session below to continue this sign-in. Child-app activity is not included here.
        </p>

        <div className="mt-6 space-y-3">
          {context.sessions.map((session, index) => (
            <div key={session.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Workspace session {index + 1}</p>
                <p className="text-sm text-muted-foreground">
                  Signed in {formatter.format(session.authenticatedAt)} · Last activity {formatter.format(session.lastActivityAt)}
                </p>
              </div>
              <form action={recoverSessionAction}>
                <input type="hidden" name="terminateSessionId" value={session.id} />
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  End and continue
                </button>
              </form>
            </div>
          ))}
        </div>

        <form action={recoverSessionAction} className="mt-6 border-t pt-6">
          <button className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            End all active sessions and continue
          </button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          This restricted recovery screen expires at {formatter.format(context.expiresAt)}.
        </p>
      </div>
    </main>
  );
}
