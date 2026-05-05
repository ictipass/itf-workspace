import Link from "next/link";
import { AppStatus, WorkspaceRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  const isSystemAdmin = user.workspaceRole === WorkspaceRole.SYSTEM_ADMIN;

  const [totalApps, activeApps, myApps, totalUsers] = await Promise.all([
    prisma.app.count(),
    prisma.app.count({ where: { status: AppStatus.ACTIVE } }),
    prisma.appAccess.count({
      where: {
        userId: user.id,
        status: "ACTIVE",
        app: {
          status: AppStatus.ACTIVE,
        },
      },
    }),
    isSystemAdmin ? prisma.user.count() : Promise.resolve(0),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspace Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Access your permitted ITF applications from one secure workspace.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard/apps">Open My Apps</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="My Apps" value={myApps} />
        <StatCard title="Active Apps" value={activeApps} />
        <StatCard title="Registered Apps" value={totalApps} />
        {isSystemAdmin ? <StatCard title="Users" value={totalUsers} /> : null}
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}