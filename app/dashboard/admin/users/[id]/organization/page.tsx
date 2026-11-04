import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserOrganizationForm } from "./user-organization-form";

const messages: Record<string, { tone: string; text: string }> = {
  saved: { tone: "border-emerald-200 bg-emerald-50 text-emerald-800", text: "Organizational details were saved and audited. Synchronize ITF Flow before testing changed routing or organization details." },
  "step-up-complete": { tone: "border-amber-200 bg-amber-50 text-amber-900", text: "Authenticator verification is fresh. Review the intended correction and submit it again." },
  validation: { tone: "border-red-200 bg-red-50 text-red-800", text: "Supply a valid active organizational assignment, HR source reference and correction reason." },
  "invalid-organization": { tone: "border-red-200 bg-red-50 text-red-800", text: "The selected organizational records are inactive or do not form a valid office, department, division and unit hierarchy." },
  stale: { tone: "border-red-200 bg-red-50 text-red-800", text: "This staff record changed after the page loaded. Review the current details and try again." },
  "supervisor-not-found": { tone: "border-red-200 bg-red-50 text-red-800", text: "The supervisor staff number does not identify an active Workspace user." },
  self: { tone: "border-red-200 bg-red-50 text-red-800", text: "A user cannot supervise themselves." },
  cycle: { tone: "border-red-200 bg-red-50 text-red-800", text: "That change would create a reporting-line cycle and was rejected." },
  unchanged: { tone: "border-amber-200 bg-amber-50 text-amber-900", text: "No organizational correction was detected." },
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
  const [user, flowApp, offices, departments, divisions, units, positions] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { supervisor: true, appAccesses: { include: { app: true } } } }),
    prisma.app.findUnique({ where: { slug: "itf-flow" }, select: { id: true } }),
    prisma.office.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, officeId: true }, orderBy: { name: "asc" } }),
    prisma.division.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, departmentId: true }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, divisionId: true }, orderBy: { name: "asc" } }),
    prisma.position.findMany({ where: { isActive: true }, select: { id: true, code: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  if (!user) notFound();

  const flowAccess = user.appAccesses.find((access) => access.app.slug === "itf-flow");
  const message = result ? messages[result] : null;
  const accessHref = `/dashboard/admin/access?${new URLSearchParams({ ...(flowApp ? { app: flowApp.id } : {}), q: user.staffNumber ?? user.email }).toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><h1 className="text-3xl font-bold tracking-tight">Edit user details</h1><p className="mt-2 text-muted-foreground">{user.fullName} · {user.staffNumber ?? user.email}</p></div>
        <Button asChild variant="outline"><Link href="/dashboard/admin/users">Back to users</Link></Button>
      </div>
      {message ? <p className={`rounded-lg border px-4 py-3 text-sm ${message.tone}`} role="status">{message.text}</p> : null}
      <Card className="rounded-2xl"><CardHeader><CardTitle>Access and current context</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
        <div><p className="text-sm text-muted-foreground">Workspace role</p><Badge variant="outline">{user.workspaceRole}</Badge><p className="mt-1 text-xs text-muted-foreground">Privileged Workspace roles require the separate approved super-administrator process.</p></div>
        <div><p className="text-sm text-muted-foreground">ITF Flow access</p><p className="font-medium">{flowAccess ? <><Badge variant="outline">{flowAccess.appRole}</Badge> · {flowAccess.status}</> : "Not granted"}</p><Button asChild variant="link" className="h-auto p-0"><Link href={accessHref}>Correct app role in App Access</Link></Button></div>
        <div><p className="text-sm text-muted-foreground">Current supervisor</p><p className="font-medium">{user.supervisor ? `${user.supervisor.fullName} (${user.supervisor.staffNumber ?? user.supervisor.email})` : "No supervisor assigned"}</p><Button asChild variant="link" className="h-auto p-0"><Link href="/dashboard/admin/users/import">Synchronize entitled staff to ITF Flow</Link></Button></div>
      </CardContent></Card>
      <Card className="rounded-2xl"><CardHeader><CardTitle>Correct organizational details</CardTitle><p className="text-sm text-muted-foreground">Use HR-authoritative information. This page changes organizational placement and supervisor only; it does not grant Workspace privilege or application access.</p></CardHeader><CardContent>
        <UserOrganizationForm
          references={{ offices, departments, divisions, units, positions: positions.map((position) => ({ id: position.id, code: position.code, name: position.title })) }}
          user={{ id: user.id, officeId: user.officeId, departmentId: user.departmentId, divisionId: user.divisionId, unitId: user.unitId, positionId: user.positionId, supervisorId: user.supervisorId, supervisorStaffNumber: user.supervisor?.staffNumber ?? "" }}
        />
      </CardContent></Card>
    </div>
  );
}
