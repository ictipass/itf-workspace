"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import {
  beginEnrollmentAction,
  confirmEnrollmentAction,
  verifyMfaAction,
  type MfaActionState,
} from "./actions";

const initialState: MfaActionState = {};

export function TotpEnrollmentForm({ returnTo }: { returnTo: string }) {
  const [challenge, begin, beginning] = useActionState(beginEnrollmentAction, initialState);
  const [confirmation, confirm, confirming] = useActionState(
    confirmEnrollmentAction,
    initialState
  );

  if (confirmation.recoveryCodes) {
    return <RecoveryCodes codes={confirmation.recoveryCodes} returnTo={returnTo} />;
  }

  if (!challenge.secret) {
    return (
      <form action={begin} className="mt-6 space-y-4">
        {challenge.error ? <ErrorMessage>{challenge.error}</ErrorMessage> : null}
        <button disabled={beginning} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {beginning ? "Preparing..." : "Begin TOTP enrollment"}
        </button>
      </form>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-xl border bg-muted/40 p-4">
        <div className="text-center">
          <p className="text-sm font-medium">Scan with your authenticator app</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The setup challenge expires at {new Date(challenge.expiresAt!).toLocaleTimeString()}.
          </p>
          {challenge.qrCodeDataUrl ? (
            <Image
              src={challenge.qrCodeDataUrl}
              alt="QR code for adding ITF Workspace to an authenticator app"
              width={240}
              height={240}
              unoptimized
              className="mx-auto mt-4 rounded-lg border bg-white p-2"
            />
          ) : null}
          <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-muted-foreground">
            Treat this QR code like a password. Do not photograph, share or send it to another person.
          </p>
        </div>
        <details className="mt-4 border-t pt-4 text-xs">
          <summary className="cursor-pointer font-medium">
            Cannot scan? Enter a setup key manually
          </summary>
          <code className="mt-3 block break-words rounded bg-background p-3 text-center text-sm tracking-wider">
            {formatSetupKey(challenge.secret)}
          </code>
          <p className="mt-2 leading-5 text-muted-foreground">
            Use SHA-1, six digits and a 30-second period. Spaces only improve readability and are not part of the key.
          </p>
        </details>
      </div>
      <form action={confirm} className="space-y-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        {confirmation.error ? <ErrorMessage>{confirmation.error}</ErrorMessage> : null}
        <CodeField />
        <button disabled={confirming} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {confirming ? "Confirming..." : "Confirm enrollment"}
        </button>
      </form>
    </div>
  );
}

export function RecoveryCodes({ codes, returnTo }: { codes: string[]; returnTo: string }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Save these one-time recovery codes now.</strong> They will not be shown again. Store them outside
        this device in an ICT-approved password manager or sealed secure record. Each code works once.
      </div>
      <pre className="grid gap-2 rounded-xl border bg-muted p-4 text-center font-mono text-sm sm:grid-cols-2">
        {codes.map((code) => <span key={code}>{code}</span>)}
      </pre>
      <Link href={returnTo} className="block w-full rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground">
        I have stored the codes securely
      </Link>
    </div>
  );
}

function formatSetupKey(secret: string) {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

export function TotpVerificationForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState(verifyMfaAction, initialState);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      {state.error ? <ErrorMessage>{state.error}</ErrorMessage> : null}
      <CodeField />
      <button disabled={pending} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {pending ? "Verifying..." : "Verify and continue"}
      </button>
    </form>
  );
}

function CodeField() {
  return (
    <div>
      <label className="text-sm font-medium" htmlFor="totp-code">Six-digit authenticator code</label>
      <input id="totp-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm tracking-[0.35em] outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{children}</div>;
}
