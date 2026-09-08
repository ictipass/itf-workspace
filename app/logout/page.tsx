import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { signOutWorkspaceAndAppsAction } from "./actions";

export default async function WorkspaceLogoutPage() {
  const context = await getCurrentSessionContext();
  if (!context) redirect("/login?reason=sessionExpired");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-lg rounded-2xl shadow-sm">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldCheck className="size-5" />
          </div>
          <CardTitle>Sign out of Workspace and all apps?</CardTitle>
          <CardDescription>
            This ends your current Workspace session and sends logout instructions
            to connected ITF applications. Other Workspace sessions on your devices
            are not affected.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <form action={signOutWorkspaceAndAppsAction}>
            <Button type="submit" variant="destructive" className="w-full sm:w-auto">
              <LogOut data-icon="inline-start" />
              Sign out everywhere
            </Button>
          </form>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/dashboard/apps">Cancel and view my apps</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
