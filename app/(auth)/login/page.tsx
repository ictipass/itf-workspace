import { redirect } from "next/navigation";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import LoginForm from "./login-form";

type Props = {
  searchParams: Promise<{
    passwordChanged?: string;
    callbackUrl?: string;
    reason?: string;
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await getCurrentSessionContext();
  const params = await searchParams;

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-sm">
        {params.passwordChanged === "1" ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Password changed successfully. Please sign in again.
          </div>
        ) : null}
        {params.reason === "sessionExpired" ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Your Workspace session expired. Sign in again to continue.
          </div>
        ) : null}
        {params.reason === "recoveryExpired" ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Session recovery expired. Sign in again to request a new recovery screen.
          </div>
        ) : null}

        <h1 className="text-2xl font-bold tracking-tight">ITF Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to access the ITF applications in your workflow.
        </p>

        <div className="mt-6">
          <LoginForm callbackUrl={params.callbackUrl?.startsWith("/") ? params.callbackUrl : "/dashboard"} />
        </div>
      </div>
    </main>
  );
}
