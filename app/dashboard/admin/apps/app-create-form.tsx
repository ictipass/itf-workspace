"use client";

import { forwardRef, useActionState, useRef } from "react";
import { createAppAction } from "./actions";
import type { AppActionState } from "./actions";
import AppUrlTestButton from "./app-url-test-button";
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
const assuranceRequirements = ["STANDARD", "SENSITIVE"] as const;

export default function AppCreateForm() {
  const urlInputRef = useRef<HTMLInputElement>(null);
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
      <Field
        label="Launch Audience"
        name="launchAudience"
        error={state.errors?.launchAudience?.[0]}
        description="Stable audience expected by the child app, for example itf-flow. It must not change with the URL."
      />
      <Field
        label="Canonical Launch URL"
        name="url"
        error={state.errors?.url?.[0]}
        ref={urlInputRef}
        description="Use the exact reachable host, for example https://itfpromotel.itf.gov.ng. Do not add Workspace token parameters manually."
      />
      <AppUrlTestButton getUrl={() => urlInputRef.current?.value ?? ""} />
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
        label="Application Assurance"
        name="assuranceRequirement"
        values={assuranceRequirements}
        error={state.errors?.assuranceRequirement?.[0]}
      />

      <Field
        label="Initial App Role Code"
        name="initialRoleCode"
        error={state.errors?.initialRoleCode?.[0]}
        description="Every active app needs at least one explicitly classified role, for example USER or OFFICER."
      />

      <EnumSelect
        label="Initial Role Assurance"
        name="initialRoleAssurance"
        values={assuranceRequirements}
        error={state.errors?.initialRoleAssurance?.[0]}
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

const Field = forwardRef<HTMLInputElement, {
  label: string;
  name: string;
  error?: string;
  description?: string;
}>(function Field({
  label,
  name,
  error,
  description,
}, ref) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input ref={ref} name={name} />
      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
});

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
