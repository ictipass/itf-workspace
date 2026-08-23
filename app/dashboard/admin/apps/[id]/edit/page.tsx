import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import AppEditForm from "../../app-edit-form";
import { upsertAppRolePolicyAction } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditAppPage({ params }: Props) {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const app = await prisma.app.findUnique({
    where: { id },
    include: { rolePolicies: { orderBy: { roleCode: "asc" } } },
  });

  if (!app) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost">
        <Link href="/dashboard/admin/apps">← Back to Apps</Link>
      </Button>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Edit App</CardTitle>
        </CardHeader>
        <CardContent>
          <AppEditForm app={app} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Child-app role assurance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Every assignable role is explicitly STANDARD or SENSITIVE. Application sensitivity always takes precedence.
          </p>
          {app.rolePolicies.map((policy) => (
            <form key={policy.id} action={upsertAppRolePolicyAction} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
              <input type="hidden" name="appId" value={app.id} />
              <div><label className="text-sm font-medium">Role code</label><input name="roleCode" readOnly value={policy.roleCode} className="mt-1 w-full rounded-md border bg-muted px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Assurance</label><select name="assuranceRequirement" defaultValue={policy.assuranceRequirement} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="STANDARD">STANDARD</option><option value="SENSITIVE">SENSITIVE</option></select></div>
              <Button type="submit" variant="outline">Update</Button>
            </form>
          ))}
          <form action={upsertAppRolePolicyAction} className="grid gap-3 rounded-xl border border-dashed p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <input type="hidden" name="appId" value={app.id} />
            <div><label className="text-sm font-medium">New role code</label><input name="roleCode" required pattern="[A-Za-z0-9_-]+" className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Assurance</label><select name="assuranceRequirement" defaultValue="STANDARD" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="STANDARD">STANDARD</option><option value="SENSITIVE">SENSITIVE</option></select></div>
            <Button type="submit">Add role</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
