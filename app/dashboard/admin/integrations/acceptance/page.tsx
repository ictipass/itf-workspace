import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { stagingAcceptanceTarget } from "@/lib/integrations/staging-acceptance-policy";
import { AcceptanceForm } from "./acceptance-form";

export default async function StagingAcceptancePage() {
  const actor = await requireCurrentUser();
  if (actor.workspaceRole !== "SYSTEM_ADMIN") redirect("/dashboard");
  const target = stagingAcceptanceTarget();
  return <div className="mx-auto max-w-4xl space-y-6">
    <h1 className="text-3xl font-bold">Staging integration acceptance</h1>
    <p className="text-muted-foreground">A01-06/A01-07 use one pinned ordinary test identity, fresh TOTP and explicit maintenance approval. These tests do not authorize production access changes.</p>
    {target ? <><p className="rounded-md border border-amber-300 p-4">Pinned Workspace user ID: <code>{target}</code>. Launch Flow for this test user before each case. Stop unrelated staging changes and review the acceptance runbook.</p><AcceptanceForm /></>
      : <p className="rounded-md border p-4">Diagnostic disabled or expired. Configure the matching temporary enable flag, test-user ID and UTC expiry in both staging projects. Production targets are not supported.</p>}
  </div>;
}
