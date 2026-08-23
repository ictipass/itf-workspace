"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  warningSeconds: number;
};

export function SessionActivityMonitor({ idleExpiresAt, absoluteExpiresAt, warningSeconds }: Props) {
  const [expiry, setExpiry] = useState(() => Math.min(Date.parse(idleExpiresAt), Date.parse(absoluteExpiresAt)));
  const [remaining, setRemaining] = useState(() => expiry - Date.now());
  const lastRecorded = useRef(0);
  const expiryRef = useRef(expiry);

  useEffect(() => {
    expiryRef.current = expiry;
  }, [expiry]);

  const expire = useCallback(() => {
    window.location.replace("/login?reason=sessionExpired");
  }, []);

  const recordActivity = useCallback(async (force = false) => {
    const now = Date.now();
    const inWarningWindow = expiryRef.current - now <= warningSeconds * 1000;
    if (!force && (inWarningWindow || now - lastRecorded.current < 60_000)) return;
    lastRecorded.current = now;

    const response = await fetch("/api/session/activity", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    });
    if (!response.ok) return expire();
    const value = (await response.json()) as { idleExpiresAt: string; absoluteExpiresAt: string };
    const next = Math.min(Date.parse(value.idleExpiresAt), Date.parse(value.absoluteExpiresAt));
    setExpiry(next);
    const channel = new BroadcastChannel("itf-workspace-session");
    channel.postMessage({ expiry: next });
    channel.close();
  }, [expire, warningSeconds]);

  useEffect(() => {
    const onActivity = () => void recordActivity();
    const channel = new BroadcastChannel("itf-workspace-session");
    channel.onmessage = (event) => {
      if (typeof event.data?.expiry === "number") setExpiry(event.data.expiry);
    };
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity);
    return () => {
      channel.close();
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, [recordActivity]);

  useEffect(() => {
    const update = () => {
      const value = expiry - Date.now();
      setRemaining(value);
      if (value <= 0) expire();
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiry, expire]);

  if (remaining <= 0 || remaining > warningSeconds * 1000) return null;
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.max(0, Math.ceil((remaining % 60_000) / 1000));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-labelledby="session-warning-title">
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
        <h2 id="session-warning-title" className="text-xl font-bold">Your session is about to expire</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Workspace will sign you out in {minutes}:{String(seconds).padStart(2, "0")} due to inactivity.
          Activity in a child application does not extend this session.
        </p>
        <button onClick={() => void recordActivity(true)} className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Continue Workspace session
        </button>
      </div>
    </div>
  );
}
