import { redirect } from "next/navigation";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { TotpEnrollmentForm } from "../mfa-forms";

export default async function MfaEnrollmentPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const context = await getCurrentSessionContext();
  if (!context) redirect("/login");
  const params = await searchParams;
  const returnTo = params.returnTo?.startsWith("/dashboard") ? params.returnTo : "/dashboard";
  if (context.user.totpEnrolledAt) redirect(`/mfa/verify?returnTo=${encodeURIComponent(returnTo)}`);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Set up authenticator verification</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sensitive access requires TOTP. Workspace never sends MFA codes through email.</p>
        <TotpEnrollmentForm returnTo={returnTo} />
      </div>
    </main>
  );
}
