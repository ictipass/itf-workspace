import { redirect } from "next/navigation";
import {
  AppAccessStatus,
  AppStatus,
  UserStatus,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import GrantAccessForm from "./grant-access-form";
import RevokeAccessButton from "./revoke-access-button";
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

export default async function AppAccessPage() {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    redirect("/dashboard");
  }

  const [users, apps, accesses] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        staffNumber: true,
      },
      orderBy: {
        fullName: "asc",
      },
    }),

    prisma.app.findMany({
      where: {
        status: AppStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        rolePolicies: {
          where: { isActive: true },
          select: { roleCode: true, assuranceRequirement: true },
          orderBy: { roleCode: "asc" },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.appAccess.findMany({
      include: {
        user: true,
        app: true,
      },
      orderBy: {
        grantedAt: "desc",
      },
      take: 100,
    }),
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Grant App Access</CardTitle>
        </CardHeader>
        <CardContent>
          <GrantAccessForm users={users} apps={apps} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Existing App Access</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>App</TableHead>
                <TableHead>App Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {accesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No app access records found.
                  </TableCell>
                </TableRow>
              ) : (
                accesses.map((access) => (
                  <TableRow key={access.id}>
                    <TableCell>
                      <div className="font-medium">{access.user.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {access.user.email}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-medium">{access.app.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {access.app.slug}
                      </div>
                    </TableCell>

                    <TableCell>{access.appRole}</TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          access.status === AppAccessStatus.ACTIVE
                            ? "default"
                            : "secondary"
                        }
                      >
                        {access.status}
                      </Badge>
                    </TableCell>

                    <TableCell>{formatDate(access.grantedAt)}</TableCell>

                    <TableCell className="text-right">
                      {access.status === AppAccessStatus.ACTIVE ? (
                        <RevokeAccessButton accessId={access.id} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Revoked
                        </span>
                      )}
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
