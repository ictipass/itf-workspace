import Image from "next/image";
import Link from "next/link";
import {
  AppWindow,
  ArrowRight,
  ClipboardCheck,
  DatabaseZap,
  Fingerprint,
  Landmark,
  LockKeyhole,
  Network,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const platformCapabilities = [
  {
    title: "Centralized Identity",
    description:
      "One governed staff identity layer for Workspace and connected institutional applications.",
    icon: Fingerprint,
  },
  {
    title: "Application Registry",
    description:
      "A controlled catalogue for ITF digital services, environments, ownership, and launch access.",
    icon: AppWindow,
  },
  {
    title: "Access Governance",
    description:
      "Role-based access, app-specific responsibilities, and soft revocation with audit context.",
    icon: ShieldCheck,
  },
  {
    title: "Audit Readiness",
    description:
      "Traceable activity records for sign-ins, app launches, onboarding, setup changes, and access grants.",
    icon: ClipboardCheck,
  },
];

const enterpriseFlows = [
  "Staff app launch and access readiness",
  "Organization setup and reference data",
  "Bulk user onboarding and temporary password control",
  "SSO-lite launch context for autonomous business apps",
];

const stakeholderEntries = [
  {
    title: "ITF Staff",
    description: "Access approved applications from one secure digital workspace.",
    icon: UsersRound,
  },
  {
    title: "System Administrators",
    description: "Govern users, apps, access, setup data, and audit visibility.",
    icon: LockKeyhole,
  },
  {
    title: "Business Applications",
    description: "Integrate with Workspace for identity, launch, roles, and audit contracts.",
    icon: Network,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b bg-[linear-gradient(180deg,oklch(0.98_0.01_12),oklch(1_0_0))]">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <div className="mx-auto flex min-h-[92vh] max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/itf-logo.png"
                alt="Industrial Training Fund logo"
                width={48}
                height={48}
                priority
                className="h-12 w-12 object-contain"
              />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Industrial Training Fund
                </p>
                <p className="text-xs text-muted-foreground">
                  Unified Digital Access Portal
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/login">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </header>

          <div className="flex flex-1 items-center py-16">
            <div className="mx-auto max-w-5xl text-center">
              <Badge variant="secondary" className="rounded-full px-4 py-1">
                Enterprise Workspace Platform
              </Badge>

              <div className="mt-8 flex justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border bg-white shadow-sm">
                  <Image
                    src="/itf-logo.png"
                    alt=""
                    width={72}
                    height={72}
                    className="h-18 w-18 object-contain"
                  />
                </div>
              </div>

              <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                ITF Workspace
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
                A secure enterprise entry point for ITF applications, staff
                identities, access governance, organization records, and
                compliance-ready audit visibility.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/login">
                    Enter Workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link href="/dashboard/apps">View App Launcher</Link>
                </Button>
              </div>

              <div className="mx-auto mt-12 grid max-w-4xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
                <HeroMetric label="Identity" value="Centralized" />
                <HeroMetric label="Access" value="Role Governed" />
                <HeroMetric label="Audit" value="Traceable" />
                <HeroMetric label="Apps" value="Autonomous" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {stakeholderEntries.map((entry) => (
            <Card key={entry.title} className="rounded-2xl">
              <CardHeader className="space-y-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <entry.icon className="h-5 w-5" />
                </div>
                <CardTitle>{entry.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {entry.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <Badge variant="outline" className="rounded-full">
              Platform Governance
            </Badge>
            <h2 className="mt-5 text-3xl font-bold tracking-tight">
              Built as the control layer for ITF digital services.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Workspace is not the workflow engine. It is the institutional
              layer that business applications depend on for trusted identity,
              app discovery, access control, organization context, and audit
              trails.
            </p>

            <div className="mt-8 space-y-3">
              {enterpriseFlows.map((flow) => (
                <div key={flow} className="flex items-start gap-3 text-sm">
                  <DatabaseZap className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{flow}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {platformCapabilities.map((capability) => (
              <Card key={capability.title} className="rounded-2xl">
                <CardHeader className="space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-primary">
                    <capability.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{capability.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {capability.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-sidebar px-4 py-10 text-sidebar-foreground sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white">
              <Landmark className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">One Workspace. Many ITF services.</h2>
              <p className="mt-1 text-sm text-sidebar-foreground/70">
                Central access governance for the next generation of institutional applications.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/login">Sign in securely</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}
