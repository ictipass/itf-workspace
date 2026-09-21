"use client";

import { useActionState } from "react";
import { recoverWithCodeAction, type RecoveryActionState } from "./actions";

export function RecoveryForm() {
  const [state, action, pending] = useActionState<RecoveryActionState, FormData>(recoverWithCodeAction, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}
      <label className="block text-sm font-medium">Current Workspace password
        <input name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2" />
      </label>
      <label className="block text-sm font-medium">Unused recovery code
        <input name="recoveryCode" autoComplete="off" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 font-mono uppercase" />
      </label>
      <button disabled={pending} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {pending ? "Recovering..." : "Invalidate old authenticator and continue"}
      </button>
    </form>
  );
}
