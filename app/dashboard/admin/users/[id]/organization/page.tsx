import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateReportingLineAction } from "./actions";

const messages: Record<string, { tone: string; text: string }> = {
  saved: { tone: "border-emerald-200 bg-emerald-50 text-emerald-800", text: "Reporting line saved and audited. Synchronize the ITF Flow directory before testing recipient search." },
  "step-up-complete": { tone: "border-amber-200 bg-amber-50 text-amber-900", text: "Authenticator verification is fresh. Review the intended reporting-line change and submit it again." },
  validation: { tone: "border-red-200 bg-red-50 text-red-800", text: "Supply a valid supervisor staff number or leave it blank, an HR source reference, and a reason of at least 10 characters." },
  stale: { tone: "border-red-200 bg-red-50 text-red-800", text: "The reporting line changed after this page loaded. Review the current value and try again." },
  "supervisor-not-found": { tone: "border-red-200 bg-red-50 text-red-800", text: "The supervisor staff number does not identify an active Workspace user." },
  self: { tone: "border-red-200 bg-red-50 text-red-800", text: "A user cannot supervise themselves." },
  cycle: { tone: "border-red-200 bg-red-50 text-red-800", text: "That change would create a reporting-line cycle and was rejected." },
  unchanged: { tone: "border-amber-200 bg-amber-50 text-amber-900", text: "No reporting-line change was detected." },
};

export default async function UserOrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string | string[] }>;
}) {
  const actor = await requireCurrentUser();
  if (actor.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) redirect("/dashboard");
  const { id } = await params;
  const query = await searchParams;
  const result = Array.isArray(query.result) ? query.result[0] : query.result;
  const [user, flowApp] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: { supervisor: true, office: true, department: true, division: true, unit: true, position: true, appAccesses: { include: { app: true } } },
    }),
    prisma.app.findUnique({ where: { slug: "itf-flow" }, select: { id: true } }),
  ]);
  if (!user) notFound();
  const flowAccess = user.appAccesses.find((access) => access.app.slug === "itf-flow");
  const message = result ? messages[result] : null;
  const accessHref = `/dashboard/admin/access?${new URLSearchParams({ ...(flowApp ? { app: flowApp.id } : {}), q: user.staffNumber ?? user.email }).toString()}`;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><h1 className="text-3xl font-bold tracking-tight">Reporting line</h1><p className="mt-2 text-muted-foreground">{user.fullName} · {user.staffNumber ?? user.email}</p></div>
      <Button asChild variant="outline"><Link href="/dashboard/admin/users">Back to users</Link></Button>
    </div>
    {message ? <p className={`rounded-lg border px-4 py-3 text-sm ${message.tone}`} role="status">{message.text}</p> : null}
    <Card className="rounded-2xl"><CardHeader><CardTitle>Current organizational and Flow context</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
      <div><p className="text-sm text-muted-foreground">Organization</p><p className="font-medium">{[user.office?.name, user.department?.name, user.division?.name, user.unit?.name].filter(Boolean).join(" · ") || "Not assigned"}</p><p className="text-sm text-muted-foreground">{user.position?.title ?? "No position"}</p></div>
      <div><p className="text-sm text-muted-foreground">ITF Flow access</p><p className="font-medium">{flowAccess ? <><Badge variant="outline">{flowAccess.appRole}</Badge> · {flowAccess.status}</> : "Not granted"}</p><Button asChild variant="link" className="h-auto p-0"><Link href={accessHref}>Correct Flow role in App Access</Link></Button></div>
      <div><p className="text-sm text-muted-foreground">Current supervisor</p><p className="font-medium">{user.supervisor ? `${user.supervisor.fullName} (${user.supervisor.staffNumber ?? user.supervisor.email})` : "No supervisor assigned"}</p></div>
      <div><p className="text-sm text-muted-foreground">Required final step</p><Button asChild variant="link" className="h-auto p-0"><Link href="/dashboard/admin/users/import">Synchronize entitled staff to ITF Flow</Link></Button></div>
    </CardContent></Card>
    <Card className="rounded-2xl"><CardHeader><CardTitle>Correct supervisor assignment</CardTitle><p className="text-sm text-muted-foreground">Use HR-authoritative information. Leave the supervisor staff number blank only to remove an incorrect relationship. This does not change the user’s Flow role.</p></CardHeader><CardContent>
      <form action={updateReportingLineAction} className="grid max-w-2xl gap-4">
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="expectedSupervisorId" value={user.supervisorId ?? "NONE"} />
        <div className="space-y-2"><Label htmlFor="supervisorStaffNumber">Supervisor staff number</Label><Input id="supervisorStaffNumber" name="supervisorStaffNumber" defaultValue={user.supervisor?.staffNumber ?? ""} maxLength={100} placeholder="Leave blank to remove the current supervisor" /></div>
        <div className="space-y-2"><Label htmlFor="sourceReference">HR source reference</Label><Input id="sourceReference" name="sourceReference" required minLength={3} maxLength={200} placeholder="Reference only; do not paste staff records" /></div>
        <div className="space-y-2"><Label htmlFor="reason">Correction reason</Label><textarea id="reason" name="reason" required minLength={10} maxLength={500} className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Explain the approved reporting-line correction" /></div>
        <p className="text-sm text-muted-foreground">Fresh authenticator verification is required. The change is audited and becomes effective in Flow only after directory synchronization.</p>
        <Button type="submit">Save reporting line</Button>
      </form>
    </CardContent></Card>
  </div>;
}
