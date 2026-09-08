import { z } from "zod";
import { resolveAppIconKey } from "@/lib/apps/app-icons";

export const WORKSPACE_APP_NAVIGATION_VERSION =
  "itf-workspace-app-navigation-v1" as const;

export const workspaceAppNavigationRequestSchema = z.object({
  version: z.literal(WORKSPACE_APP_NAVIGATION_VERSION),
  requestId: z.uuid(),
  sourceAppSlug: z.string().regex(/^[a-z0-9-]{2,64}$/),
  workspaceUserId: z.string().min(1).max(200),
  workspaceSessionId: z.string().min(1).max(200),
});

export type WorkspaceAppNavigationRequest = z.infer<
  typeof workspaceAppNavigationRequestSchema
>;

type NavigationAccess = {
  appRole: string;
  app: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    category: string;
    rolePolicies: ReadonlyArray<{ roleCode: string; isActive: boolean }>;
  };
};

export function buildWorkspaceAppNavigationResponse(input: {
  request: WorkspaceAppNavigationRequest;
  workspaceOrigin: string;
  accesses: ReadonlyArray<NavigationAccess>;
  generatedAt?: Date;
}) {
  const apps = input.accesses
    .filter(
      (access) =>
        access.app.slug !== input.request.sourceAppSlug &&
        access.app.rolePolicies.some(
          (policy) => policy.isActive && policy.roleCode === access.appRole
        )
    )
    .map((access) => ({
      id: access.app.id,
      name: access.app.name,
      slug: access.app.slug,
      icon: resolveAppIconKey(access.app.icon),
      category: access.app.category,
      launchUrl: new URL(
        `/dashboard/apps/${encodeURIComponent(access.app.id)}/launch`,
        input.workspaceOrigin
      ).toString(),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    version: WORKSPACE_APP_NAVIGATION_VERSION,
    requestId: input.request.requestId,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    apps,
  };
}
