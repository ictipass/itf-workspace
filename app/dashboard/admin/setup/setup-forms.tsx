"use client";

import { useActionState } from "react";
import { OfficeType } from "@/lib/generated/prisma/enums";
import {
  createDepartmentAction,
  createDivisionAction,
  createOfficeAction,
  createPositionAction,
  createUnitAction,
} from "./actions";
import type { SetupActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: SetupActionState = {
  success: false,
  message: "",
};

type SelectOption = {
  id: string;
  name: string;
  code: string;
};

export function OfficeForm() {
  const [state, formAction, isPending] = useActionState(
    createOfficeAction,
    initialState
  );

  return (
    <BaseForm state={state}>
      <form action={formAction} className="space-y-4">
        <Field label="Office Name" name="name" error={state.errors?.name?.[0]} />
        <Field label="Office Code" name="code" error={state.errors?.code?.[0]} />

        <div className="space-y-2">
          <Label>Office Type</Label>
          <Select name="type">
            <SelectTrigger>
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
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Create Office"}
        </Button>
      </form>
    </BaseForm>
  );
}

export function DepartmentForm({ offices }: { offices: SelectOption[] }) {
  const [state, formAction, isPending] = useActionState(
    createDepartmentAction,
    initialState
  );

  return (
    <BaseForm state={state}>
      <form action={formAction} className="space-y-4">
        <Field label="Department Name" name="name" error={state.errors?.name?.[0]} />
        <Field label="Department Code" name="code" error={state.errors?.code?.[0]} />

        <div className="space-y-2">
          <Label>Office</Label>
          <Select name="officeId">
            <SelectTrigger>
              <SelectValue placeholder="Select office" />
            </SelectTrigger>
            <SelectContent>
              {offices.map((office) => (
                <SelectItem key={office.id} value={office.id}>
                  {office.name} ({office.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Create Department"}
        </Button>
      </form>
    </BaseForm>
  );
}

export function DivisionForm({
  departments,
}: {
  departments: SelectOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createDivisionAction,
    initialState
  );

  return (
    <BaseForm state={state}>
      <form action={formAction} className="space-y-4">
        <Field label="Division Name" name="name" error={state.errors?.name?.[0]} />
        <Field label="Division Code" name="code" error={state.errors?.code?.[0]} />

        <div className="space-y-2">
          <Label>Department</Label>
          <Select name="departmentId">
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name} ({department.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Create Division"}
        </Button>
      </form>
    </BaseForm>
  );
}

export function UnitForm({ divisions }: { divisions: SelectOption[] }) {
  const [state, formAction, isPending] = useActionState(
    createUnitAction,
    initialState
  );

  return (
    <BaseForm state={state}>
      <form action={formAction} className="space-y-4">
        <Field label="Unit Name" name="name" error={state.errors?.name?.[0]} />
        <Field label="Unit Code" name="code" error={state.errors?.code?.[0]} />

        <div className="space-y-2">
          <Label>Division</Label>
          <Select name="divisionId">
            <SelectTrigger>
              <SelectValue placeholder="Select division" />
            </SelectTrigger>
            <SelectContent>
              {divisions.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.name} ({division.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Create Unit"}
        </Button>
      </form>
    </BaseForm>
  );
}

export function PositionForm() {
  const [state, formAction, isPending] = useActionState(
    createPositionAction,
    initialState
  );

  return (
    <BaseForm state={state}>
      <form action={formAction} className="space-y-4">
        <Field label="Position Title" name="title" error={state.errors?.title?.[0]} />
        <Field label="Position Code" name="code" error={state.errors?.code?.[0]} />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Create Position"}
        </Button>
      </form>
    </BaseForm>
  );
}

function BaseForm({
  state,
  children,
}: {
  state: SetupActionState;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {state.message ? (
        <Alert variant={state.success ? "default" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      {children}
    </div>
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
