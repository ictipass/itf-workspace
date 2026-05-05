import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ChangePasswordForm from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.isTemporaryPassword) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Change Password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are using a temporary password. Please set a new password before
          continuing.
        </p>

        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}