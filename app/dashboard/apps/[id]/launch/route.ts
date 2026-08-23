import { redirect } from "next/navigation";
import { AppAccessStatus, AppStatus, AuditAction } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { appendWorkspaceLaunchToken } from "@/lib/apps/launch-url";
import { effectiveLaunchAssurance, hasFreshMfa } from "@/lib/security/launch-assurance";
import { createWorkspaceLaunchV2Token } from "@/lib/security/workspace-launch-v2";
import { resolveWorkspaceLaunchV2Configuration } from "@/lib/config/workspace-environment";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const context = await getCurrentSessionContext();
  if (!context) redirect("/login");

  const { id } = await params;
  const access = await prisma.appAccess.findFirst({
    where: {
      userId: context.user.id,
      appId: id,
      status: AppAccessStatus.ACTIVE,
      app: { status: AppStatus.ACTIVE },
    },
    include: {
      app: {
        include: {
          rolePolicies: {
            where: { isActive: true },
          },
        },
      },
    },
  });
  if (!access) redirect("/dashboard/apps");

  const rolePolicy = access.app.rolePolicies.find(
    (policy) => policy.roleCode === access.appRole
  );
  if (!rolePolicy) redirect("/dashboard/apps?launchError=unclassified-role");

  const configuration = resolveWorkspaceLaunchV2Configuration();
  const requiredAssurance = effectiveLaunchAssurance(
    context.user.workspaceRole,
    access.app.assuranceRequirement,
    rolePolicy.assuranceRequirement
  );
  const returnTo = `/dashboard/apps/${access.app.id}/launch`;

  if (requiredAssurance === "SENSITIVE" && !context.user.totpEnrolledAt) {
    redirect(`/mfa/enroll?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (
    requiredAssurance === "SENSITIVE" &&
    !hasFreshMfa(context.session.mfaAuthenticatedAt, configuration.stepUpSeconds)
  ) {
    redirect(`/mfa/verify?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const launchToken = createWorkspaceLaunchV2Token({
    sub: context.user.id,
    aud: access.app.launchAudience,
    identity: {
      name: context.user.name,
      email: context.user.email,
      staffNumber: context.user.staffNumber,
      workspaceRole: context.user.workspaceRole,
      officeId: context.user.officeId,
      departmentId: context.user.departmentId,
      divisionId: context.user.divisionId,
      unitId: context.user.unitId,
      positionId: context.user.positionId,
    },
    entitlement: {
      appId: access.app.id,
      slug: access.app.slug,
      role: access.appRole,
      requiredAssurance,
    },
    authentication: {
      workspaceSessionId: context.session.id,
      methods: context.session.authenticationMethods,
      authenticatedAt: Math.floor(context.session.authenticatedAt.getTime() / 1000),
      mfaAuthenticatedAt: context.session.mfaAuthenticatedAt
        ? Math.floor(context.session.mfaAuthenticatedAt.getTime() / 1000)
        : undefined,
    },
  });
  const launchUrl = appendWorkspaceLaunchToken(access.app.url, launchToken.token);

  await prisma.auditLog.create({
    data: {
      actorId: context.user.id,
      action: AuditAction.APP_OPENED,
      metadata: {
        appId: access.app.id,
        appName: access.app.name,
        launchTokenId: launchToken.tokenId,
        launchTokenExpiresAt: launchToken.expiresAt,
        launchTokenVersion: launchToken.payload.version,
        launchTokenKeyId: launchToken.keyId,
        requiredAssurance,
      },
    },
  });

  redirect(launchUrl);
}
