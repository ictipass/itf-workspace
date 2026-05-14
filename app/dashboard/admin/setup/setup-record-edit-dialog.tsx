"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { updateSetupDisplayNameAction } from "./actions";
import type { SetupActionState } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Entity = "office" | "department" | "division" | "unit" | "position";

const initialState: SetupActionState = {
  success: false,
  message: "",
};

export default function SetupRecordEditDialog({
  id,
  entity,
  code,
  displayName,
}: {
  id: string;
  entity: Entity;
  code: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateSetupDisplayNameAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit display name</DialogTitle>
          <DialogDescription>
            Only the visible name changes. Codes and hierarchy remain unchanged.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="entity" value={entity} />

          {state.message && !state.success ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1 rounded-xl border bg-muted/40 p-3 text-sm">
            <div className="font-medium">{code}</div>
            <div className="text-muted-foreground">{displayName}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${entity}-${id}-display-name`}>Display name</Label>
            <Input
              id={`${entity}-${id}-display-name`}
              name="displayName"
              defaultValue={displayName}
              minLength={2}
              required
            />
            {state.errors?.displayName?.[0] ? (
              <p className="text-xs text-destructive">
                {state.errors.displayName[0]}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save change"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
