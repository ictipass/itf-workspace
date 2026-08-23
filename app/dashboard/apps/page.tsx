import Link from "next/link";
import { AppStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { effectiveLaunchAssurance } from "@/lib/security/launch-assurance";

export default async function MyAppsPage() {
  const user = await requireCurrentUser();

  const apps = await prisma.app.findMany({
    where: {
      status: AppStatus.ACTIVE,
    },
    include: {
      accessRules: {
        where: {
          userId: user.id,
          status: "ACTIVE",
        },
        take: 1,
      },
      rolePolicies: {
        where: { isActive: true },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Apps</h1>
        <p className="mt-2 text-muted-foreground">
          All recognized ITF applications. Apps outside your entitlement remain visible but locked.
        </p>
      </div>

      {apps.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center text-muted-foreground">
            No application access has been assigned to you yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => {
            const access = app.accessRules[0];
            const rolePolicy = access
              ? app.rolePolicies.find((policy) => policy.roleCode === access.appRole)
              : undefined;
            const assurance = access && rolePolicy
              ? effectiveLaunchAssurance(
                  user.workspaceRole,
                  app.assuranceRequirement,
                  rolePolicy.assuranceRequirement
                )
              : null;
            return (
              <Card
                key={app.id}
                className={`rounded-2xl ${access ? "" : "opacity-55 grayscale"}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle>{app.name}</CardTitle>
                    <Badge variant="secondary">{app.category}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {app.description ?? "No description provided."}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{app.environment}</Badge>
                    {access?.appRole ? <Badge>{access.appRole}</Badge> : null}
                    {assurance ? (
                      <Badge variant={assurance === "SENSITIVE" ? "destructive" : "secondary"}>
                        {assurance}
                      </Badge>
                    ) : null}
                  </div>

                  {access && rolePolicy ? (
                    <Button asChild className="w-full">
                      <Link href={`/dashboard/apps/${app.id}/launch`}>Launch App</Link>
                    </Button>
                  ) : access ? (
                    <Button className="w-full" disabled>
                      Role classification required
                    </Button>
                  ) : (
                    <Button className="w-full" disabled>
                      Access not assigned
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
