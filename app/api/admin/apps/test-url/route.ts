import { NextResponse } from "next/server";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { normalizeAppLaunchUrl } from "@/lib/apps/launch-url";

export async function POST(request: Request) {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { url?: string } | null;

  if (!body?.url) {
    return NextResponse.json(
      { ok: false, message: "URL is required." },
      { status: 400 }
    );
  }

  let normalizedUrl = "";

  try {
    normalizedUrl = normalizeAppLaunchUrl(body.url);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Enter a valid http or https URL." },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    let response = await fetch(normalizedUrl, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    if ([403, 405, 501].includes(response.status)) {
      response = await fetch(normalizedUrl, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
      });
    }

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      normalizedUrl,
      finalUrl: response.url,
      message: response.ok
        ? "URL is reachable."
        : `URL responded with HTTP ${response.status}.`,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      normalizedUrl,
      message:
        error instanceof Error && error.name === "AbortError"
          ? "URL test timed out."
          : "URL could not be reached from Workspace.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
