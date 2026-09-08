import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { AppAccessStatus, AppStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { validateWorkspaceSession } from "@/lib/auth/workspace-session.service";
import { resolveItfFlowAppNavigationConfiguration } from "@/lib/config/workspace-environment";
import {
  buildWorkspaceAppNavigationResponse,
  workspaceAppNavigationRequestSchema,
} from "@/lib/integrations/app-navigation-contract";

export const runtime = "nodejs";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

function authorized(supplied: string | undefined, configured: string) {
  if (!supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(request: Request) {
  let configuration: ReturnType<typeof resolveItfFlowAppNavigationConfiguration>;
  try {
    configuration = resolveItfFlowAppNavigationConfiguration();
  } catch {
    return response({ error: "Application navigation is unavailable." }, 503);
  }

  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!authorized(bearer, configuration.secret)) {
    return response({ error: "Unauthorized" }, 401);
  }

  const parsed = workspaceAppNavigationRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success || parsed.data.sourceAppSlug !== configuration.appSlug) {
    return response({ error: "Invalid application navigation request." }, 400);
  }

  const now = new Date();
  const session = await validateWorkspaceSession(
    parsed.data.workspaceSessionId,
    parsed.data.workspaceUserId
  );
  if (!session) {
    return response({ error: "Workspace session is no longer active." }, 401);
  }

  const accesses = await prisma.appAccess.findMany({
    where: {
      userId: parsed.data.workspaceUserId,
      status: AppAccessStatus.ACTIVE,
      app: { status: AppStatus.ACTIVE },
    },
    select: {
      appRole: true,
      app: {
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          category: true,
          rolePolicies: {
            where: { isActive: true },
            select: { roleCode: true, isActive: true },
          },
        },
      },
    },
  });

  return response(
    buildWorkspaceAppNavigationResponse({
      request: parsed.data,
      workspaceOrigin: configuration.workspaceOrigin,
      accesses,
      generatedAt: now,
    })
  );
}
