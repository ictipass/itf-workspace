"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { OfficeType } from "@/lib/generated/prisma/enums";
import { updateSetupRecordAction } from "./actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Entity = "office" | "department" | "division" | "unit" | "position";

type ParentOption = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

const initialState: SetupActionState = {
  success: false,
  message: "",
};

export default function SetupRecordEditDialog({
  id,
  entity,
  code,
  displayName,
  officeType,
  parentId,
  parentOptions = [],
}: {
  id: string;
  entity: Entity;
  code: string;
  displayName: string;
  officeType?: OfficeType;
  parentId?: string;
  parentOptions?: ParentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState(parentId);
  const [state, formAction, isPending] = useActionState(
    updateSetupRecordAction,
    initialState
  );

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
          <DialogTitle>Edit reference data</DialogTitle>
          <DialogDescription>
            Correct all applicable fields. Changing a parent moves this record and
            its descendants in the organization hierarchy; linked staff remain
            attached through immutable identifiers.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="entity" value={entity} />

          {state.message ? (
            <Alert variant={state.success ? "default" : "destructive"}>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

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

          <div className="space-y-2">
            <Label htmlFor={`${entity}-${id}-code`}>Code</Label>
            <Input
              id={`${entity}-${id}-code`}
              name="code"
              defaultValue={code}
              minLength={2}
              maxLength={64}
              pattern="[A-Za-z0-9][A-Za-z0-9_-]*"
              required
            />
            <p className="text-xs text-muted-foreground">
              Saved in uppercase. Existing spreadsheets using the old code must be corrected.
            </p>
            {state.errors?.code?.[0] ? (
              <p className="text-xs text-destructive">{state.errors.code[0]}</p>
            ) : null}
          </div>

          {entity === "office" ? (
            <div className="space-y-2">
              <Label htmlFor={`${entity}-${id}-office-type`}>Office type</Label>
              <Select name="officeType" defaultValue={officeType} required>
                <SelectTrigger id={`${entity}-${id}-office-type`}>
                  <SelectValue placeholder="Select office type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(OfficeType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.officeType?.[0] ? (
                <p className="text-xs text-destructive">{state.errors.officeType[0]}</p>
              ) : null}
            </div>
          ) : null}

          {entity === "department" || entity === "division" || entity === "unit" ? (
            <div className="space-y-2">
              <Label htmlFor={`${entity}-${id}-parent`}>
                {entity === "department"
                  ? "Office"
                  : entity === "division"
                    ? "Department"
                    : "Division"}
              </Label>
              <Select
                name={
                  entity === "department"
                    ? "officeId"
                    : entity === "division"
                      ? "departmentId"
                      : "divisionId"
                }
                value={selectedParentId}
                onValueChange={setSelectedParentId}
                required
              >
                <SelectTrigger id={`${entity}-${id}-parent`}>
                  <SelectValue placeholder="Select a parent" />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((option) => (
                    <SelectItem
                      key={option.id}
                      value={option.id}
                      disabled={!option.isActive && option.id !== parentId}
                    >
                      {option.name} ({option.code}){option.isActive ? "" : " — inactive"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.[
                entity === "department"
                  ? "officeId"
                  : entity === "division"
                    ? "departmentId"
                    : "divisionId"
              ]?.[0] ? (
                <p className="text-xs text-destructive">
                  {state.errors[
                    entity === "department"
                      ? "officeId"
                      : entity === "division"
                        ? "departmentId"
                        : "divisionId"
                  ]?.[0]}
                </p>
              ) : null}
            </div>
          ) : null}

          {selectedParentId && selectedParentId !== parentId ? (
            <label className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <input
                className="mt-0.5"
                type="checkbox"
                name="confirmHierarchyMove"
                value="yes"
                required
              />
              <span>
                I confirm this hierarchy move and understand that affected staff
                and descendants will resolve through the new parent.
              </span>
            </label>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
