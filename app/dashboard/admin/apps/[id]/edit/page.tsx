import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import AppEditForm from "../../app-edit-form";
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
    </div>
  );
}