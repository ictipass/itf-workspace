import Link from "next/link";
import { AppStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function MyAppsPage() {
  const user = await requireCurrentUser();

  const appAccesses = await prisma.appAccess.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      app: {
        status: AppStatus.ACTIVE,
      },
    },
    include: {
      app: true,
    },
    orderBy: {
      grantedAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Apps</h1>
        <p className="mt-2 text-muted-foreground">
          Applications you are currently allowed to access.
        </p>
      </div>

      {appAccesses.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center text-muted-foreground">
            No application access has been assigned to you yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {appAccesses.map((access) => (
            <Card key={access.id} className="rounded-2xl">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle>{access.app.name}</CardTitle>
                  <Badge variant="secondary">{access.app.category}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {access.app.description ?? "No description provided."}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{access.app.environment}</Badge>
                  {access.appRole ? <Badge>{access.appRole}</Badge> : null}
                </div>

                <Button asChild className="w-full">
                  <Link href={`/dashboard/apps/${access.app.id}/launch`}>
                    Launch App
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}