import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import AppCreateForm from "./app-create-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { deactivateAppAction } from "./actions";
import { Button } from "@/components/ui/button";
import AppUrlTestButton from "./app-url-test-button";

export default async function AdminAppsPage() {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    redirect("/dashboard");
  }

  const apps = await prisma.app.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Register App</CardTitle>
        </CardHeader>
        <CardContent>
          <AppCreateForm />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Registered Apps</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Assurance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {apps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No apps registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                apps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium">{app.name}</div>
                      <div className="text-xs text-muted-foreground">{app.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{app.category}</Badge>
                    </TableCell>
                    <TableCell>{app.environment}</TableCell>
                    <TableCell><Badge variant={app.assuranceRequirement === "SENSITIVE" ? "destructive" : "outline"}>{app.assuranceRequirement}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={app.status === "ACTIVE" ? "default" : "secondary"}>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate">{app.url}</div>
                      <div className="mt-2">
                        <AppUrlTestButton url={app.url} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/admin/apps/${app.id}/edit`}>Edit</Link>
                        </Button>

                        {app.status !== "INACTIVE" ? (
                          <form action={deactivateAppAction}>
                            <input type="hidden" name="id" value={app.id} />
                            <Button type="submit" size="sm" variant="destructive">
                              Deactivate
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
