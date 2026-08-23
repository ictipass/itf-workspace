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
import { activateUserAction, deactivateUserAction } from "./actions";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

type UsersPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    role?: string | string[];
    temporaryPassword?: string | string[];
  }>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const query = firstQueryValue(params.q)?.trim() ?? "";
  const status = firstQueryValue(params.status) ?? "ALL";
  const role = firstQueryValue(params.role) ?? "ALL";
  const temporaryPassword = firstQueryValue(params.temporaryPassword) ?? "ALL";

  const statusFilter = Object.values(UserStatus).includes(status as UserStatus)
    ? (status as UserStatus)
    : undefined;
  const roleFilter = Object.values(WorkspaceRole).includes(role as WorkspaceRole)
    ? (role as WorkspaceRole)
    : undefined;
  const temporaryPasswordFilter =
    temporaryPassword === "YES"
      ? true
      : temporaryPassword === "NO"
        ? false
        : undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { staffNumber: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(roleFilter ? { workspaceRole: roleFilter } : {}),
      ...(temporaryPasswordFilter === undefined
        ? {}
        : { isTemporaryPassword: temporaryPasswordFilter }),
    },
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
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <CardTitle>Users</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {users.length} user{users.length === 1 ? "" : "s"} found
              </p>
            </div>

            <form className="flex flex-col gap-2 md:flex-row md:items-center">
              <Input
                className="md:w-72"
                name="q"
                placeholder="Search name, email, staff no."
                defaultValue={query}
              />
              <NativeSelect name="status" defaultValue={status}>
                <NativeSelectOption value="ALL">All statuses</NativeSelectOption>
                {Object.values(UserStatus).map((item) => (
                  <NativeSelectOption key={item} value={item}>
                    {item}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect name="role" defaultValue={role}>
                <NativeSelectOption value="ALL">All roles</NativeSelectOption>
                {Object.values(WorkspaceRole).map((item) => (
                  <NativeSelectOption key={item} value={item}>
                    {item}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                name="temporaryPassword"
                defaultValue={temporaryPassword}
              >
                <NativeSelectOption value="ALL">Any password state</NativeSelectOption>
                <NativeSelectOption value="YES">Temporary password</NativeSelectOption>
                <NativeSelectOption value="NO">Password changed</NativeSelectOption>
              </NativeSelect>
              <Button type="submit" variant="outline">
                Apply
              </Button>
              <Button asChild type="button" variant="ghost">
                <Link href="/dashboard/admin/users">Reset</Link>
              </Button>
            </form>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
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

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild type="button" size="sm" variant="outline">
                          <Link href={`/dashboard/admin/users/${item.id}/sessions`}>Sessions</Link>
                        </Button>
                        {item.status === UserStatus.ACTIVE ? (
                          <form action={deactivateUserAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <Button type="submit" size="sm" variant="destructive">Deactivate</Button>
                          </form>
                        ) : (
                          <form action={activateUserAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <Button type="submit" size="sm" variant="outline">Activate</Button>
                          </form>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
