import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenText, ExternalLink, ShieldAlert } from "lucide-react";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { ADMIN_HELP_TOPICS } from "@/lib/support/admin-help-topics";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminHelpPage() {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BookOpenText className="size-6" />
        </span>
        <div>
          <Badge variant="outline">System administrator guide</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Help and operational procedures</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Expand a topic for approved steps, safe troubleshooting and escalation boundaries. This page describes
            current Workspace behavior; it does not authorize policy exceptions or direct database changes.
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-amber-200 bg-amber-50/70">
        <CardContent className="flex gap-3 pt-6 text-sm text-amber-950">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            Never enter passwords, temporary credentials, authenticator codes, QR/setup keys, API/private keys,
            database URLs or launch assertions in support tickets, chat or screenshots.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Topics</CardTitle>
          <p className="text-sm text-muted-foreground">
            {ADMIN_HELP_TOPICS.length} categories covering routine administration and common incidents.
          </p>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="gap-3">
            {ADMIN_HELP_TOPICS.map((topic) => (
              <AccordionItem key={topic.id} value={topic.id} className="rounded-xl border px-4 last:border-b">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <span>
                    <span className="block text-base">{topic.title}</span>
                    <span className="mt-1 block pr-6 text-sm font-normal text-muted-foreground">
                      {topic.description}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-5">
                  {topic.entries.map((entry) => (
                    <section key={entry.title} className="rounded-xl bg-muted/50 p-4">
                      <h2 className="font-semibold">{entry.title}</h2>
                      <p className="mt-1 leading-6 text-muted-foreground">{entry.summary}</p>
                      <ol className="mt-3 list-decimal space-y-2 pl-5 leading-6">
                        {entry.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                      {entry.escalation ? (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                          <strong>Escalate:</strong> {entry.escalation}
                        </p>
                      ) : null}
                      {entry.href && entry.linkLabel ? (
                        <Button asChild size="sm" variant="outline" className="mt-4">
                          <Link href={entry.href}>
                            {entry.linkLabel}
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </Button>
                      ) : null}
                    </section>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
