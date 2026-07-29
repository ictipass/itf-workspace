"use client";

import { useActionState } from "react";
import { syncItfFlowDirectoryAction } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initialState = { success: false, message: "" };

export function DirectorySyncForm() {
  const [state, action, pending] = useActionState(syncItfFlowDirectoryAction, initialState);
  return (
    <form action={action} className="space-y-4">
      {state.message ? (
        <Alert variant={state.success ? "default" : "destructive"}>
          <AlertTitle>{state.success ? "Synchronization completed" : "Synchronization failed"}</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Synchronizing…" : "Synchronize entitled staff to ITF Flow"}
      </Button>
    </form>
  );
}
