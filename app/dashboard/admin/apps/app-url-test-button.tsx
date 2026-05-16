"use client";

import { useState } from "react";
import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

type UrlTestResult = {
  ok: boolean;
  message: string;
  normalizedUrl?: string;
  finalUrl?: string;
  status?: number;
};

export default function AppUrlTestButton({
  url,
  getUrl,
}: {
  url?: string;
  getUrl?: () => string;
}) {
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<UrlTestResult | null>(null);

  async function testUrl() {
    const value = getUrl?.() ?? url ?? "";

    if (!value.trim()) {
      setResult({ ok: false, message: "Enter a URL to test." });
      return;
    }

    setIsPending(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/apps/test-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = (await response.json()) as UrlTestResult;
      setResult(data);
    } catch {
      setResult({ ok: false, message: "URL test failed in the browser." });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={testUrl}
        disabled={isPending}
      >
        <Wifi className="h-4 w-4" />
        {isPending ? "Testing..." : "Test URL"}
      </Button>

      {result ? (
        <div
          className={
            result.ok
              ? "text-xs leading-5 text-green-700"
              : "text-xs leading-5 text-destructive"
          }
        >
          <div>{result.message}</div>
          {result.normalizedUrl ? (
            <div className="break-all text-muted-foreground">
              Checked: {result.normalizedUrl}
            </div>
          ) : null}
          {result.finalUrl && result.finalUrl !== result.normalizedUrl ? (
            <div className="break-all text-muted-foreground">
              Final: {result.finalUrl}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
