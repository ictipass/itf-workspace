"use client";

import { useActionState } from "react";
import { createAppAction } from "./actions";
import type { AppActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: AppActionState = {
  success: false,
  message: "",
};

const appCategories = [
  "WORKFLOW",
  "TRAINING",
  "FINANCE",
  "HR",
  "PROCUREMENT",
  "COMPLIANCE",
  "REPORTING",
  "ADMINISTRATION",
  "OTHER",
] as const;

const appEnvironments = ["PRODUCTION", "STAGING", "DEVELOPMENT"] as const;

const appStatuses = ["ACTIVE", "INACTIVE", "MAINTENANCE"] as const;

export default function AppCreateForm() {
  const [state, formAction, isPending] = useActionState(
    createAppAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <Alert variant={state.success ? "default" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field label="Name" name="name" error={state.errors?.name?.[0]} />
      <Field label="Slug" name="slug" error={state.errors?.slug?.[0]} />
      <Field label="URL" name="url" error={state.errors?.url?.[0]} />
      <Field label="Icon" name="icon" error={state.errors?.icon?.[0]} />

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea name="description" />
      </div>

      <EnumSelect
        label="Category"
        name="category"
        values={appCategories}
        error={state.errors?.category?.[0]}
      />

      <EnumSelect
        label="Environment"
        name="environment"
        values={appEnvironments}
        error={state.errors?.environment?.[0]}
      />

      <EnumSelect
        label="Status"
        name="status"
        values={appStatuses}
        error={state.errors?.status?.[0]}
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Register App"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  error,
}: {
  label: string;
  name: string;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input name={name} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function EnumSelect({
  label,
  name,
  values,
  error,
}: {
  label: string;
  name: string;
  values: readonly string[];
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select name={name}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {values.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
