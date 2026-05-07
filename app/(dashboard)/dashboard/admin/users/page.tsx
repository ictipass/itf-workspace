import Link from "next/link";
import { redirect } from "next/navigation";
import { UserStatus, WorkspaceRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default async function UsersPage() {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    include: {
      office: true,
      department: true,
      division: true,
      unit: true,
      position: true,
      _count: {
        select: {
          appAccesses: true,
        },
      },
    },
    orderBy: {
      fullName: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Directory</h1>
          <p className="mt-2 text-muted-foreground">
            Manage staff identities and app access readiness.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard/admin/users/import">Bulk Import Users</Link>
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Temp Password</TableHead>
                <TableHead>Apps</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.staffNumber ?? "No staff number"}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">{item.workspaceRole}</Badge>
                    </TableCell>

                    <TableCell>{item.office?.name ?? "N/A"}</TableCell>

                    <TableCell>{item.department?.name ?? "N/A"}</TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          item.status === UserStatus.ACTIVE ? "default" : "secondary"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {item.isTemporaryPassword ? (
                        <Badge variant="destructive">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>

                    <TableCell>{item._count.appAccesses}</TableCell>
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