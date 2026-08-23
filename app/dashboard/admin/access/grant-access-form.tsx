"use client";

import { useActionState } from "react";
import { grantAppAccessAction } from "./actions";
import type { AccessActionState } from "./actions";
import type { App, User } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: AccessActionState = { success: false, message: "" };

type UserOption = Pick<User, "id" | "fullName" | "email" | "staffNumber">;
type AppOption = Pick<App, "id" | "name" | "slug"> & {
  rolePolicies: { roleCode: string; assuranceRequirement: string }[];
};

export default function GrantAccessForm({ users, apps }: { users: UserOption[]; apps: AppOption[] }) {
  const [state, formAction, isPending] = useActionState(grantAppAccessAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <Alert variant={state.success ? "default" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label>User</Label>
        <Select name="userId">
          <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.fullName} — {user.email}{user.staffNumber ? ` (${user.staffNumber})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError errors={state.errors?.userId} />
      </div>

      <div className="space-y-2">
        <Label>Application role</Label>
        <Select name="entitlement">
          <SelectTrigger><SelectValue placeholder="Select application and role" /></SelectTrigger>
          <SelectContent>
            {apps.flatMap((app) => app.rolePolicies.map((role) => (
              <SelectItem key={`${app.id}:${role.roleCode}`} value={`${app.id}:${role.roleCode}`}>
                {app.name} — {role.roleCode} ({role.assuranceRequirement})
              </SelectItem>
            )))}
          </SelectContent>
        </Select>
        <FieldError errors={state.errors?.entitlement} />
        <p className="text-xs text-muted-foreground">
          Only active roles with an explicit assurance classification are assignable.
        </p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Granting..." : "Grant Access"}
      </Button>
    </form>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-destructive">{errors[0]}</p>;
}
