"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AcceptanceError, startStagingAcceptance, resumeStagingAcceptance, type AcceptanceEvidence } from "@/lib/integrations/staging-acceptance.service";
export type AcceptanceState = { message: string; evidence?: AcceptanceEvidence; needsMfa?: boolean };

function failure(error: unknown): AcceptanceState {
  if (error instanceof Error && error.message === "FRESH_MFA_REQUIRED") {
    return { message: "Verify your authenticator in another tab, then review and submit again.", needsMfa: true };
  }
  return { message: error instanceof AcceptanceError ? error.message : "Operation could not be confirmed. Check the audit/outbox before retrying; do not assume revocation rolled back." };
}
export async function startAcceptanceAction(_state: AcceptanceState, form: FormData): Promise<AcceptanceState> {
  try {
    const evidence = await startStagingAcceptance({ caseId: form.get("caseId"), approvalReference: form.get("approvalReference"), confirmation: form.get("confirmation") });
    revalidatePath("/dashboard/admin/access");
    revalidatePath("/dashboard/apps");
    return { message: evidence.passed ? "Diagnostic checks passed. Confirm the browser observations, record evidence, then restore approved access and synchronize Flow."
      : "Test access is revoked. Inspect the result; for A01-07, retry only after the displayed due time. Do not regrant before delivery is resolved.", evidence };
  } catch (error) { return failure(error); }
}
export async function retryAcceptanceAction(_state: AcceptanceState, form: FormData): Promise<AcceptanceState> {
  const parsed = z.uuid().safeParse(form.get("eventId"));
  if (!parsed.success || form.get("confirmation") !== "RETRY_TEST_EVENT") return { message: "Confirm retry of the recorded test event." };
  try {
    const evidence = await resumeStagingAcceptance(parsed.data);
    return { message: evidence.passed ? "Recovery checks passed. Record browser/evidence acceptance, then regrant and synchronize the dedicated test user."
      : "Recovery is not accepted yet. Check status/due time; do not edit outbox rows or regrant while delivery is unresolved.", evidence };
  } catch (error) { return failure(error); }
}
