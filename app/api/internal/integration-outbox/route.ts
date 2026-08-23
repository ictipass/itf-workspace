import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deliverItfFlowSessionEvents } from "@/lib/integrations/itf-flow-session-events";

export const runtime = "nodejs";

function authorized(request: Request) {
  const configured = process.env.WORKSPACE_OUTBOX_WORKER_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured || configured.length < 32 || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  const result = await deliverItfFlowSessionEvents();
  return NextResponse.json(result, {
    status: result.configured ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
