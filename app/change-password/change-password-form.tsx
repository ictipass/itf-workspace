"use client";

import { useActionState } from "react";
import { changePasswordAction, ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = {
  success: false,
  message: "",
};

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            state.success
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <Field
        label="Current Temporary Password"
        name="currentPassword"
        errors={state.errors?.currentPassword}
      />

      <Field
        label="New Password"
        name="newPassword"
        errors={state.errors?.newPassword}
      />

      <Field
        label="Confirm New Password"
        name="confirmPassword"
        errors={state.errors?.confirmPassword}
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {isPending ? "Updating..." : "Change Password"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  errors,
}: {
  label: string;
  name: string;
  errors?: string[];
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        name={name}
        type="password"
        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {errors?.length ? (
        <p className="mt-1 text-xs text-red-600">{errors[0]}</p>
      ) : null}
    </div>
  );
}