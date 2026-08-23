import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/current-user";
import ImportUsersForm from "./user-import-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DirectorySyncForm } from "./directory-sync-form";

export default async function ImportUsersPage() {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Import Users</h1>
          <p className="mt-2 text-muted-foreground">
            Upload an HR master-list CSV to create ordinary staff in batch. This import is all-or-nothing;
            privileged Workspace roles must be granted separately by an approved super administrator.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/api/admin/setup/reference-codes">
            Download Reference Codes
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link href="/api/admin/users/import-template">Download CSV Template</Link>
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportUsersForm />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>ITF Flow Directory Synchronization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Send active ITF Flow entitlements, organization placement, status, role, and
            supervisor assignments to the child application in batches of 200.
          </p>
          <DirectorySyncForm />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Required Columns</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`staffNumber,fullName,email,workspaceRole,officeCode,departmentCode,divisionCode,unitCode,positionCode,supervisorStaffNumber,itfFlowRole`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
