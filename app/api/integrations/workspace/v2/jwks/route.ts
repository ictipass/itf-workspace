import { NextResponse } from "next/server";
import { getWorkspaceLaunchPublicJwks } from "@/lib/security/workspace-launch-v2";

export function GET() {
  return NextResponse.json(getWorkspaceLaunchPublicJwks(), {
    headers: {
      "Cache-Control": "public, max-age=300, must-revalidate",
      "Content-Type": "application/jwk-set+json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
