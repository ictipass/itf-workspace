import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const workspaceControls = [
  {
    title: "Identity",
    description: "Staff sign-in, session control, and temporary-password enforcement.",
    icon: Fingerprint,
  },
  {
    title: "Access",
    description: "Application availability is governed by Workspace role and app access.",
    icon: ShieldCheck,
  },
  {
    title: "Audit",
    description: "Launches, access changes, and setup activity remain traceable.",
    icon: ClipboardCheck,
  },
];

const operatingSignals = [
  "Internal staff portal",
  "Central app launcher",
  "Enterprise access governance",
  "Audit-ready activity trail",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative isolate flex min-h-screen overflow-hidden border-b bg-[linear-gradient(180deg,oklch(0.98_0.01_12),oklch(1_0_0)_58%,oklch(0.97_0_0))]">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <div className="absolute inset-y-0 right-0 hidden w-1/3 border-l bg-muted/35 lg:block" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <Image
                src="/itf-logo.png"
                alt="Industrial Training Fund logo"
                width={44}
                height={44}
                loading="eager"
                className="h-11 w-11 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold uppercase tracking-wide text-primary">
                  Industrial Training Fund
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Workspace Access Portal
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

          <div className="grid flex-1 gap-12 py-12 lg:grid-cols-[1fr_420px] lg:items-center lg:py-20">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="rounded-full px-4 py-1">
                Internal Enterprise Workspace
              </Badge>

              <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                ITF Workspace
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                The secure staff entry point for approved ITF applications,
                centralized access governance, institutional setup data, and
                compliance-ready activity records.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/login">
                    Enter Workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link href="/dashboard/apps">Open App Launcher</Link>
                </Button>
              </div>

              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-2">
                {operatingSignals.map((signal) => (
                  <div
                    key={signal}
                    className="flex items-center gap-3 rounded-2xl border bg-white/75 px-4 py-3 text-sm font-medium shadow-sm"
                  >
                    <LockKeyhole className="h-4 w-4 text-primary" />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:justify-self-end">
              <div className="logo-3d-scene mx-auto flex aspect-square w-full max-w-sm items-center justify-center">
                <div className="logo-3d-coin" aria-label="Industrial Training Fund seal">
                  <div className="logo-3d-face logo-3d-front">
                    <Image
                      src="/itf-logo.png"
                      alt="Industrial Training Fund seal"
                      width={224}
                      height={224}
                      loading="eager"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="logo-3d-face logo-3d-back" aria-hidden="true">
                    <Image
                      src="/itf-logo.png"
                      alt=""
                      width={224}
                      height={224}
                      loading="eager"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {workspaceControls.map((control) => (
            <Card key={control.title} className="rounded-2xl">
              <CardHeader className="space-y-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <control.icon className="h-5 w-5" />
                </div>
                <CardTitle>{control.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {control.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
