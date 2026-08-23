import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { classifyWorkspaceSession } from "@/lib/auth/session-policy";
import { listWorkspaceSessions } from "@/lib/auth/workspace-session.service";
import { prisma } from "@/lib/prisma";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { terminateAllUserSessionsAction, terminateUserSessionAction } from "./actions";

const formatter = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

export default async function AdminUserSessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentSessionContext();
  if (!actor || actor.user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) redirect("/dashboard");
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, fullName: true, email: true } });
  if (!user) notFound();
  const sessions = await listWorkspaceSessions(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.fullName}&apos;s sessions</h1>
          <p className="mt-2 text-muted-foreground">{user.email} · Administrative session controls</p>
        </div>
        <form action={terminateAllUserSessionsAction}>
          <input type="hidden" name="userId" value={user.id} />
          <Button type="submit" variant="destructive">End all active sessions</Button>
        </form>
      </div>
      <div className="space-y-3 rounded-2xl border bg-background p-6">
        {sessions.length === 0 ? <p className="text-sm text-muted-foreground">No session history found.</p> : null}
        {sessions.map((session) => {
          const state = classifyWorkspaceSession(session);
          return (
            <div key={session.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2"><p className="font-medium">Signed in {formatter.format(session.authenticatedAt)}</p><Badge variant={state === "ACTIVE" ? "secondary" : "outline"}>{state.replaceAll("_", " ")}</Badge></div>
                <p className="mt-1 text-sm text-muted-foreground">Last activity {formatter.format(session.lastActivityAt)}</p>
              </div>
              {state === "ACTIVE" ? (
                <form action={terminateUserSessionAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="sessionId" value={session.id} />
                  <Button type="submit" size="sm" variant="outline">End session</Button>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
