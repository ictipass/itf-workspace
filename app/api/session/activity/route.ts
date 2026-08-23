import { NextResponse } from "next/server";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { recordWorkspaceActivity } from "@/lib/auth/workspace-session.service";

export async function POST() {
  const context = await getCurrentSessionContext();
  if (!context) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const session = await recordWorkspaceActivity(context.session.id, context.user.id);
  if (!session) return NextResponse.json({ error: "Session expired" }, { status: 401 });

  return NextResponse.json({
    idleExpiresAt: session.idleExpiresAt.toISOString(),
    absoluteExpiresAt: session.absoluteExpiresAt.toISOString(),
  });
}
