import { redirect } from "next/navigation";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { RecoveryForm } from "./recovery-form";

export default async function MfaRecoveryPage() {
  const context = await getCurrentSessionContext();
  if (!context) redirect("/login");
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Use a recovery code</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This consumes one saved code, invalidates the old authenticator and signs out every Workspace and connected-app session. Sign in again to enroll a new authenticator.
        </p>
        <RecoveryForm />
      </div>
    </main>
  );
}
