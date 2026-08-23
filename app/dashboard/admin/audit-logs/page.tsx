import { redirect } from "next/navigation";
import { AuditAction, WorkspaceRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type Props = {
  searchParams: Promise<{
    q?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

const AUDIT_COLORS: Record<AuditAction, "default" | "secondary" | "destructive" | "outline"> = {
  LOGIN: "default",
  LOGOUT: "secondary",
  APP_OPENED: "default",
  APP_CREATED: "default",
  APP_UPDATED: "secondary",
  ACCESS_GRANTED: "default",
  ACCESS_REVOKED: "destructive",
  USER_CREATED: "default",
  USER_UPDATED: "secondary",
  SESSION_TERMINATED: "destructive",
  MFA_ENROLLED: "default",
  MFA_VERIFIED: "secondary",
  APP_ROLE_POLICY_CREATED: "default",
  APP_ROLE_POLICY_UPDATED: "secondary",
};

export default async function AuditLogsPage({ searchParams }: Props) {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const action =
    params.action && Object.values(AuditAction).includes(params.action as AuditAction)
      ? (params.action as AuditAction)
      : undefined;

  const page = Math.max(Number(params.page ?? 1), 1);
  const pageSize = 25;

  const fromDate = params.from ? new Date(`${params.from}T00:00:00.000Z`) : undefined;
  const toDate = params.to ? new Date(`${params.to}T23:59:59.999Z`) : undefined;

  const where = {
    ...(action ? { action } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { actor: { fullName: { contains: q, mode: "insensitive" as const } } },
            { actor: { email: { contains: q, mode: "insensitive" as const } } },
            { actor: { staffNumber: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const queryWithoutPage = new URLSearchParams();

  if (q) queryWithoutPage.set("q", q);
  if (action) queryWithoutPage.set("action", action);
  if (params.from) queryWithoutPage.set("from", params.from);
  if (params.to) queryWithoutPage.set("to", params.to);

  function pageHref(nextPage: number) {
    const query = new URLSearchParams(queryWithoutPage);
    query.set("page", String(nextPage));
    return `/dashboard/admin/audit-logs?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="mt-2 text-muted-foreground">
          Search and filter user activities across ITF Workspace.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>

        <CardContent>
          <form className="grid gap-4 md:grid-cols-5" action="/dashboard/admin/audit-logs">
            <div className="md:col-span-2">
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search actor name, email, or staff number"
              />
            </div>

            <select
              name="action"
              defaultValue={action ?? ""}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All actions</option>
              {Object.values(AuditAction).map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <Input name="from" type="date" defaultValue={params.from ?? ""} />
            <Input name="to" type="date" defaultValue={params.to ?? ""} />

            <div className="flex gap-2 md:col-span-5">
              <Button type="submit">Apply Filters</Button>
              <Button asChild variant="outline">
                <a href="/dashboard/admin/audit-logs">Reset</a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No audit records found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.actor ? (
                        <div>
                          <div className="font-medium">{log.actor.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {log.actor.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.actor.staffNumber ?? "No staff number"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant={AUDIT_COLORS[log.action]}>
                        {log.action}
                      </Badge>
                    </TableCell>

                    <TableCell className="max-w-md">
                      <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-3 text-xs">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </TableCell>

                    <TableCell>{formatDate(log.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-6 flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Page {page} of {totalPages} • {total} record(s)
            </p>

            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" disabled={page <= 1}>
                <a href={pageHref(page - 1)}>Previous</a>
              </Button>

              <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
                <a href={pageHref(page + 1)}>Next</a>
              </Button>
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
