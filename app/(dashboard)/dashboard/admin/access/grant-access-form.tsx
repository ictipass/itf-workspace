"use client";

import { useActionState } from "react";
import { grantAppAccessAction } from "./actions";
import type { AccessActionState } from "./actions";
import type { App, User } from "@/lib/generated/prisma/client";
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

const initialState: AccessActionState = {
  success: false,
  message: "",
};

type UserOption = Pick<User, "id" | "fullName" | "email" | "staffNumber">;
type AppOption = Pick<App, "id" | "name" | "slug">;

export default function GrantAccessForm({
  users,
  apps,
}: {
  users: UserOption[];
  apps: AppOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    grantAppAccessAction,
    initialState
  );

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
          <SelectTrigger>
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.fullName} — {user.email}
                {user.staffNumber ? ` (${user.staffNumber})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError errors={state.errors?.userId} />
      </div>

      <div className="space-y-2">
        <Label>Application</Label>
        <Select name="appId">
          <SelectTrigger>
            <SelectValue placeholder="Select app" />
          </SelectTrigger>
          <SelectContent>
            {apps.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {app.name} ({app.slug})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError errors={state.errors?.appId} />
      </div>

      <div className="space-y-2">
        <Label>App Role</Label>
        <Input
          name="appRole"
          placeholder="e.g. STAFF, OFFICER, ADMIN, APPROVER"
        />
        <p className="text-xs text-muted-foreground">
          This role is passed conceptually as the user’s role within the selected app.
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
