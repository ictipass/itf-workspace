"use client";

import { useActionState } from "react";
import { importUsersAction, ImportUsersState } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ImportUsersState = {
  success: false,
  message: "",
};

export default function ImportUsersForm() {
  const [state, formAction, isPending] = useActionState(
    importUsersAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <Alert variant={state.success ? "default" : "destructive"}>
          <AlertTitle>{state.success ? "Import successful" : "Import failed"}</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.devLogPath ? (
        <Alert>
          <AlertTitle>Development credential log created</AlertTitle>
          <AlertDescription>
            Credentials were written to: <code>{state.devLogPath}</code>
          </AlertDescription>
        </Alert>
      ) : null}

      {state.errors?.length ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">Validation errors</p>
          <ul className="mt-3 max-h-72 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-destructive">
            {state.errors.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="file">CSV File</Label>
        <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
      </div>

      <label className="flex items-start gap-3 rounded-xl border p-4 text-sm">
        <input className="mt-1" type="checkbox" name="dryRun" />
        <span>
          <strong className="block">Validate only (dry run)</strong>
          Check the complete file, reference codes, reporting lines, roles, and duplicates
          without creating users or granting access.
        </span>
      </label>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Importing..." : "Import Users"}
      </Button>
    </form>
  );
}
