import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { AuthenticatorReplacementForm, RecoveryCodeRegenerationForm } from "./authenticator-forms";

export default async function AuthenticatorSecurityPage() {
  const user = await requireCurrentUser();
  if (!user.totpEnrolledAt) redirect("/mfa/enroll?returnTo=/dashboard/security/authenticator");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Authenticator security</h1><p className="mt-2 text-muted-foreground">Replace a working authenticator or issue a fresh set of one-time recovery codes.</p></div>
      <Card><CardHeader><CardTitle>Replace a working authenticator</CardTitle></CardHeader><CardContent><AuthenticatorReplacementForm /></CardContent></Card>
      <Card><CardHeader><CardTitle>Recovery codes</CardTitle></CardHeader><CardContent className="space-y-4"><RecoveryCodeRegenerationForm /><p className="text-sm text-muted-foreground">Lost access to the enrolled authenticator? <Link className="font-medium text-primary underline" href="/mfa/recover">Use one of your saved codes</Link>.</p></CardContent></Card>
    </div>
  );
}
