import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { classifyWorkspaceSession } from "@/lib/auth/session-policy";
import { listWorkspaceSessions } from "@/lib/auth/workspace-session.service";
import { terminateAllOwnSessionsAction, terminateOwnSessionAction } from "./actions";

const formatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

export default async function SessionsPage() {
  const context = await getCurrentSessionContext();
  if (!context) return null;
  const sessions = await listWorkspaceSessions(context.user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Sessions</h1>
          <p className="mt-2 text-muted-foreground">Review and immediately end your Workspace sessions.</p>
        </div>
        <form action={terminateAllOwnSessionsAction}>
          <Button type="submit" variant="destructive">End all sessions</Button>
        </form>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Recent Workspace sessions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((session) => {
            const state = classifyWorkspaceSession(session);
            return (
              <div key={session.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Signed in {formatter.format(session.authenticatedAt)}</p>
                    {session.id === context.session.id ? <Badge>Current</Badge> : null}
                    <Badge variant={state === "ACTIVE" ? "secondary" : "outline"}>{state.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Last Workspace activity {formatter.format(session.lastActivityAt)}</p>
                </div>
                {state === "ACTIVE" ? (
                  <form action={terminateOwnSessionAction}>
                    <input type="hidden" name="sessionId" value={session.id} />
                    <Button type="submit" size="sm" variant="outline">End session</Button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
