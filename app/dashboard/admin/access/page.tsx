import { redirect } from "next/navigation";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

type AppAccessPageProps = {
  searchParams: Promise<{
    app?: string | string[];
    q?: string | string[];
    page?: string | string[];
    stepUp?: string | string[];
  }>;
};

const PAGE_SIZE = 25;

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AppAccessPage({ searchParams }: AppAccessPageProps) {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const query = firstQueryValue(params.q)?.trim() ?? "";
  const requestedAppId = firstQueryValue(params.app) ?? "ALL";
  const requestedPage = Number(firstQueryValue(params.page) ?? "1");
  const stepUpComplete = firstQueryValue(params.stepUp) === "complete";

  const [users, apps] = await Promise.all([
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
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
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
  ]);

  const selectedAppId = apps.some((app) => app.id === requestedAppId)
    ? requestedAppId
    : undefined;
  const accessWhere = {
    ...(selectedAppId ? { appId: selectedAppId } : {}),
    ...(query
      ? {
          user: {
            OR: [
              { fullName: { contains: query, mode: "insensitive" as const } },
              { email: { contains: query, mode: "insensitive" as const } },
              { staffNumber: { contains: query, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const total = await prisma.appAccess.count({ where: accessWhere });
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const page = Math.min(
    Number.isFinite(requestedPage) ? Math.max(Math.trunc(requestedPage), 1) : 1,
    totalPages,
  );
  const accesses = await prisma.appAccess.findMany({
    where: accessWhere,
    include: { user: true, app: true },
    orderBy: { grantedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const activeApps = apps.filter((app) => app.status === AppStatus.ACTIVE);
  const queryWithoutPage = new URLSearchParams();
  if (selectedAppId) queryWithoutPage.set("app", selectedAppId);
  if (query) queryWithoutPage.set("q", query);

  function pageHref(nextPage: number) {
    const nextQuery = new URLSearchParams(queryWithoutPage);
    nextQuery.set("page", String(nextPage));
    return `/dashboard/admin/access?${nextQuery.toString()}`;
  }

  const returnAfterStepUp = (() => {
    const nextQuery = new URLSearchParams(queryWithoutPage);
    nextQuery.set("page", String(page));
    nextQuery.set("stepUp", "complete");
    return `/dashboard/admin/access?${nextQuery.toString()}`;
  })();

  return (
    <div className="space-y-6">
      {stepUpComplete ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Authenticator verification is fresh. Review the access record and select Revoke again.
        </p>
      ) : null}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Grant App Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-2xl">
            <GrantAccessForm users={users} apps={activeApps} />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Existing App Access</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} matching access record{total === 1 ? "" : "s"}
            </p>
          </div>
          <form
            className="grid gap-3 md:grid-cols-[minmax(220px,320px)_minmax(260px,1fr)_auto_auto]"
            action="/dashboard/admin/access"
          >
            <NativeSelect
              name="app"
              defaultValue={selectedAppId ?? "ALL"}
              aria-label="Filter by application"
            >
              <NativeSelectOption value="ALL">All applications</NativeSelectOption>
              {apps.map((app) => (
                <NativeSelectOption key={app.id} value={app.id}>
                  {app.name} ({app.status})
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search name, email, or staff number"
              aria-label="Search users within selected application"
            />
            <Button type="submit" variant="outline">
              Apply
            </Button>
            <Button asChild type="button" variant="ghost">
              <Link href="/dashboard/admin/access">Reset</Link>
            </Button>
          </form>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
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
                          <RevokeAccessButton
                            accessId={access.id}
                            returnTo={returnAfterStepUp}
                          />
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
          </div>

          <div className="mt-6 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              Page {page} of {totalPages} · {total} record{total === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(page - 1)}>Previous</Link>
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled>
                  Previous
                </Button>
              )}
              {page < totalPages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(page + 1)}>Next</Link>
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled>
                  Next
                </Button>
              )}
            </div>
          </div>
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
