"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startAcceptanceAction, retryAcceptanceAction } from "./actions";

export function AcceptanceForm() {
  const [start, startAction, starting] = useActionState(startAcceptanceAction, { message: "" });
  const [retry, retryAction, retrying] = useActionState(retryAcceptanceAction, { message: "" });
  const [reference, setReference] = useState("");
  const result = retry.evidence ?? start.evidence;
  return <div className="space-y-6">
    <form action={startAction} className="space-y-4">
      <fieldset disabled={starting || retrying || Boolean(start.evidence)} className="space-y-4">
        <Label htmlFor="caseId">Acceptance case</Label>
        <select name="caseId" id="caseId" className="h-10 w-full rounded-md border px-3">
          <option value="A01-06">A01-06 — duplicate event delivery</option>
          <option value="A01-07">A01-07 — bounded receiver failure and retry</option>
        </select>
        <Label htmlFor="approvalReference">Approved staging maintenance reference</Label>
        <Input id="approvalReference" name="approvalReference" required maxLength={300} value={reference} onChange={(event) => setReference(event.target.value)} />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmation" value="REVOKE_TEST_ACCESS" required />
          <span>I confirm the pinned identity is the approved dedicated test user. This operation revokes that user&apos;s Flow entitlement and eventually all their Flow sessions. I will record evidence and restore only approved access afterward.</span></label>
        <Button type="submit">{starting ? "Running diagnostic…" : "Revoke test access and run case"}</Button>
      </fieldset>
    </form>
    {(start.message || retry.message) && <p role="status" aria-live="polite" className="rounded-md border p-4">{retry.message || start.message}</p>}
    {(start.needsMfa || retry.needsMfa) && <Button asChild variant="outline"><Link target="_blank" rel="noopener noreferrer" href="/mfa/verify?returnTo=%2Fdashboard%2Fadmin%2Fintegrations%2Facceptance">Verify authenticator in another tab</Link></Button>}
    {result && <div className="space-y-2 rounded-md border p-4 text-sm">
      <p>Case: {result.caseId} · checks {result.passed ? "passed" : "not yet passed"}</p>
      <p>Event reference: <code>{result.eventId}</code></p>
      <p>Outbox: {result.status} · attempts: {result.attempts} · next attempt: {result.nextAttemptAt}</p>
      <p>Workspace access revoked: {String(result.entitlementRevoked)} · active Flow sessions: {result.activeFlowSessions}</p>
      <p>Durable Flow events: {result.flowEventCount} · sessions revoked by this event: {result.revokedFlowSessions}</p>
      {result.caseId === "A01-06" && <p>First delivery duplicate: {String(result.firstDuplicate)} · second delivery duplicate: {String(result.secondDuplicate)}</p>}
      {result.caseId === "A01-07" && <p>Recorded initial receiver HTTP status: {result.initialReceiverStatus ?? "not confirmed"}</p>}
    </div>}
    <form action={retryAction} className="space-y-3">
      <Label htmlFor="eventId">Resume your A01-07 event (also after a page refresh or uncertain result)</Label>
      <Input key={start.evidence?.eventId ?? "new"} id="eventId" name="eventId" defaultValue={start.evidence?.eventId} placeholder="Recorded event UUID" required maxLength={36} />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmation" value="RETRY_TEST_EVENT" required />
        <span>I confirm this is my recorded test event and access has not been regranted. Only this event may be retried.</span></label>
      <Button type="submit" variant="outline" disabled={starting || retrying}>{retrying ? "Checking/retrying…" : "Check / retry recorded outage event"}</Button>
    </form>
    <p className="text-sm text-muted-foreground">No automatic access restoration. After accepted delivery, use App Access to regrant OFFICER, then synchronize Flow and confirm a fresh launch. Disable temporary diagnostic flags afterward.</p>
    <Button asChild variant="outline"><Link href="/dashboard/admin/access">Open App Access</Link></Button>
  </div>;
}
