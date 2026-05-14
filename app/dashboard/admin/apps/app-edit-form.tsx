"use client";

import { useActionState } from "react";
import {
  App,
  AppCategory,
  AppEnvironment,
  AppStatus,
} from "@/lib/generated/prisma/client";
import { updateAppAction, AppActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: AppActionState = {
  success: false,
  message: "",
};

export default function AppEditForm({ app }: { app: App }) {
  const [state, formAction, isPending] = useActionState(updateAppAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={app.id} />

      {state.message ? (
        <Alert variant={state.success ? "default" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field label="Name" name="name" defaultValue={app.name} />
      <Field label="Slug" name="slug" defaultValue={app.slug} />
      <Field label="URL" name="url" defaultValue={app.url} />
      <Field label="Icon" name="icon" defaultValue={app.icon ?? ""} />

      <div className="space-y-2">
        <Label>Description</Label>
        <textarea
          name="description"
          defaultValue={app.description ?? ""}
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <EnumSelect name="category" label="Category" values={Object.values(AppCategory)} defaultValue={app.category} />
      <EnumSelect name="environment" label="Environment" values={Object.values(AppEnvironment)} defaultValue={app.environment} />
      <EnumSelect name="status" label="Status" values={Object.values(AppStatus)} defaultValue={app.status} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input name={name} defaultValue={defaultValue} />
    </div>
  );
}

function EnumSelect({
  label,
  name,
  values,
  defaultValue,
}: {
  label: string;
  name: string;
  values: string[];
  defaultValue: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );
}