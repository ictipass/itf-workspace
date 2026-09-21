"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { RecoveryCodes } from "@/app/mfa/mfa-forms";
import {
  beginReplacementAction,
  confirmReplacementAction,
  regenerateRecoveryCodesAction,
  type AuthenticatorActionState,
} from "./actions";

const initial: AuthenticatorActionState = {};

export function AuthenticatorReplacementForm() {
  const [beginState, begin, beginning] = useActionState(beginReplacementAction, initial);
  const [confirmState, confirm, confirming] = useActionState(confirmReplacementAction, initial);
  if (confirmState.recoveryCodes) {
    return (
      <div>
        <RecoveryCodes codes={confirmState.recoveryCodes} returnTo="/login" />
        <p className="mt-3 text-center text-xs text-muted-foreground">All existing sessions were terminated. Use the link above to sign in again.</p>
      </div>
    );
  }
  if (!beginState.secret) {
    return (
      <form action={begin} className="space-y-3">
        {beginState.error ? <Error>{beginState.error}</Error> : null}
        <label className="block text-sm font-medium">Current Workspace password<input name="currentPassword" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2" /></label>
        <CodeInput name="currentCode" label="Current authenticator code" />
        <button disabled={beginning} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {beginning ? "Verifying..." : "Verify and prepare replacement"}
        </button>
      </form>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 text-center">
        <p className="text-sm font-medium">Scan the new secret, then verify it before the old secret is replaced.</p>
        {beginState.qrCodeDataUrl ? <Image className="mx-auto mt-3" unoptimized src={beginState.qrCodeDataUrl} alt="New ITF Workspace authenticator QR code" width={220} height={220} /> : null}
        <details className="mt-3 text-sm"><summary>Use manual setup key</summary><code className="mt-2 block break-all rounded bg-muted p-3">{beginState.secret}</code></details>
      </div>
      <form action={confirm} className="space-y-3">
        {confirmState.error ? <Error>{confirmState.error}</Error> : null}
        <CodeInput name="newCode" label="Code from the new authenticator" />
        <button disabled={confirming} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {confirming ? "Replacing..." : "Replace authenticator and sign out all sessions"}
        </button>
      </form>
    </div>
  );
}

export function RecoveryCodeRegenerationForm() {
  const [state, action, pending] = useActionState(regenerateRecoveryCodesAction, initial);
  if (state.recoveryCodes) return <RecoveryCodes codes={state.recoveryCodes} returnTo="/dashboard/security/authenticator" />;
  return (
    <form action={action} className="space-y-3">
      {state.error ? <Error>{state.error}</Error> : null}
      <p className="text-sm text-muted-foreground">Generating a new set permanently invalidates every unused code from the previous set.</p>
      <button disabled={pending} className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60">{pending ? "Generating..." : "Generate a new recovery-code set"}</button>
      {state.error?.includes("Verify") ? <Link className="ml-3 text-sm text-primary underline" href="/mfa/verify?returnTo=%2Fdashboard%2Fsecurity%2Fauthenticator">Verify now</Link> : null}
    </form>
  );
}

function CodeInput({ name, label }: { name: string; label: string }) {
  return <label className="block text-sm font-medium">{label}<input name={name} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 tracking-[0.35em]" /></label>;
}

function Error({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{children}</p>;
}
