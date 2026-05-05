import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AppWindow,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const initials =
    session.user.name
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "U";

  const isSystemAdmin =
    session.user.workspaceRole === WorkspaceRole.SYSTEM_ADMIN;

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-background lg:flex lg:flex-col">
        <div className="flex h-20 items-center px-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight">ITF Workspace</h1>
            <p className="text-xs text-muted-foreground">
              Unified Digital Access Portal
            </p>
          </div>
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 p-4">
          <NavItem href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
            Dashboard
          </NavItem>

          <NavItem href="/dashboard/apps" icon={<AppWindow className="h-4 w-4" />}>
            My Apps
          </NavItem>

          {isSystemAdmin ? (
            <>
              <NavItem href="/dashboard/admin/apps" icon={<Settings className="h-4 w-4" />}>
                Manage Apps
              </NavItem>

              <NavItem href="/dashboard/admin/users" icon={<Users className="h-4 w-4" />}>
                Users
              </NavItem>

              <NavItem href="/dashboard/admin/access" icon={<ShieldCheck className="h-4 w-4" />}>
                App Access
              </NavItem>
            </>
          ) : null}
        </nav>

        <Separator />

        <div className="p-4">
          <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {session.user.workspaceRole}
              </p>
            </div>
          </div>

          <form
            className="mt-3"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline" className="w-full justify-start">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            <div>
              <p className="text-sm font-medium">Welcome back</p>
              <p className="text-xs text-muted-foreground">{session.user.name}</p>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <span className="mr-3">{icon}</span>
      {children}
    </Link>
  );
}