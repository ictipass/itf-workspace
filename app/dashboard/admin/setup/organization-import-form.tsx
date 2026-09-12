"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  organizationImportAction,
} from "./bulk-actions";
import type { OrganizationImportActionState } from "./bulk-actions";

const initialOrganizationImportState: OrganizationImportActionState = {
  success: false,
  phase: "idle",
  message: "",
};

export default function OrganizationImportForm() {
  const [state, action, pending] = useActionState(
    organizationImportAction,
    initialOrganizationImportState
  );

  return (
    <form action={action} className="space-y-4">
      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        Upload one <strong>.xlsx</strong> workbook with the exact five sheets, or
        select all five files: Offices.csv, Departments.csv, Divisions.csv,
        Units.csv and Positions.csv. Blank recordId creates a record; an exported
        recordId updates that record. Omitted records are unchanged and hierarchy
        moves are rejected.
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild type="button" variant="outline">
          <Link href="/api/admin/setup/organization-workbook?mode=template">
            Download blank template
          </Link>
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/api/admin/setup/organization-workbook?mode=current">
            Export current workbook
          </Link>
        </Button>
      </div>

      <label className="block space-y-2 text-sm font-medium">
        Organization workbook or CSV set
        <input
          className="block w-full rounded-lg border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
          type="file"
          name="organizationFiles"
          accept=".xlsx,.csv"
          multiple
          required
        />
      </label>

      {state.receipt ? (
        <input type="hidden" name="validationReceipt" value={state.receipt} />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button name="intent" value="validate" disabled={pending}>
          {pending ? "Checking…" : "Run mandatory dry run"}
        </Button>
        {state.phase === "validated" ? (
          <Button name="intent" value="apply" variant="destructive" disabled={pending}>
            Apply validated import
          </Button>
        ) : null}
      </div>

      {state.message ? (
        <Alert variant={state.success ? "default" : "destructive"}>
          <AlertTitle>
            {state.phase === "validated"
              ? "Dry run passed"
              : state.phase === "applied"
                ? "Import complete"
                : "Import not applied"}
          </AlertTitle>
          <AlertDescription>
            <p>{state.message}</p>
            {state.summary ? (
              <p>
                Submitted {state.summary.submitted}; creates {state.summary.creates};
                updates {state.summary.updates}; unchanged {state.summary.unchanged};
                activations {state.summary.activations}; deactivations {state.summary.deactivations}.
              </p>
            ) : null}
            {state.requiresFreshMfa ? (
              <p>
                <Link href="/mfa/verify?returnTo=%2Fdashboard%2Fadmin%2Fsetup">
                  Verify authenticator now
                </Link>
                , then run the dry run again.
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {state.errors?.length ? (
        <div className="max-h-72 overflow-auto rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="mb-2 text-sm font-semibold text-destructive">
            Validation errors ({state.errors.length}{state.errors.length === 100 ? "+" : ""})
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
            {state.errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
