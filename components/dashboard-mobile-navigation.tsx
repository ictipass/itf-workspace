"use client";

import Link from "next/link";
import {
  AppWindow,
  BookOpenText,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { signOutWorkspaceAndAppsAction } from "@/app/logout/actions";

type DashboardMobileNavigationProps = {
  userName: string;
  workspaceRole: string;
  hasRecoveryAuthority: boolean;
  isSystemAdmin: boolean;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function DashboardMobileNavigation({
  userName,
  workspaceRole,
  hasRecoveryAuthority,
  isSystemAdmin,
}: DashboardMobileNavigationProps) {
  const items: NavigationItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/apps", label: "My Apps", icon: AppWindow },
    { href: "/dashboard/sessions", label: "My Sessions", icon: MonitorSmartphone },
    {
      href: "/dashboard/security/authenticator",
      label: "Authenticator Security",
      icon: KeyRound,
    },
    ...(hasRecoveryAuthority
      ? [{ href: "/dashboard/admin/mfa-recovery", label: "MFA Recovery", icon: ShieldCheck }]
      : []),
    ...(isSystemAdmin
      ? [
          { href: "/dashboard/admin/setup", label: "Organization Setup", icon: Settings },
          { href: "/dashboard/admin/apps", label: "Manage Apps", icon: Settings },
          { href: "/dashboard/admin/users", label: "Users", icon: Users },
          { href: "/dashboard/admin/access", label: "App Access", icon: ShieldCheck },
          { href: "/dashboard/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
          { href: "/dashboard/admin/help", label: "Admin Help", icon: BookOpenText },
        ]
      : []),
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(22rem,88vw)] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="border-b border-sidebar-border px-6 py-5 text-left">
          <SheetTitle className="text-sidebar-foreground">ITF Workspace</SheetTitle>
          <SheetDescription className="text-sidebar-foreground/70">
            Unified Digital Access Portal
          </SheetDescription>
        </SheetHeader>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4" aria-label="Workspace navigation">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  <Icon className="mr-3 size-4" />
                  {item.label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="mb-3 truncate text-xs text-sidebar-foreground/70">{workspaceRole}</p>
          <form action={signOutWorkspaceAndAppsAction}>
            <Button
              type="submit"
              variant="secondary"
              className="w-full justify-start bg-white/10 text-white hover:bg-white/15"
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
