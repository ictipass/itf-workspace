import { redirect } from "next/navigation";
import { AppAccessStatus, AppStatus, AuditAction } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createWorkspaceLaunchToken } from "@/lib/security/sso-launch-token";
import { appendWorkspaceLaunchToken } from "@/lib/apps/launch-url";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, { params }: Props) {
  const user = await requireCurrentUser();
  const { id } = await params;

  const access = await prisma.appAccess.findFirst({
    where: {
      userId: user.id,
      appId: id,
      status: AppAccessStatus.ACTIVE,
      app: {
        status: AppStatus.ACTIVE,
      },
    },
    include: {
      app: true,
    },
  });

  if (!access) {
    redirect("/dashboard/apps");
  }

  const launchToken = createWorkspaceLaunchToken({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      staffNumber: user.staffNumber,
      workspaceRole: user.workspaceRole,
      officeId: user.officeId,
      departmentId: user.departmentId,
      divisionId: user.divisionId,
      unitId: user.unitId,
      positionId: user.positionId,
    },
    app: {
      id: access.app.id,
      slug: access.app.slug,
      name: access.app.name,
      role: access.appRole,
    },
  });
  const launchUrl = appendWorkspaceLaunchToken(access.app.url, launchToken.token);

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: AuditAction.APP_OPENED,
      metadata: {
        appId: access.app.id,
        appName: access.app.name,
        appUrl: access.app.url,
        launchTokenId: launchToken.tokenId,
        launchTokenExpiresAt: launchToken.expiresAt,
      },
    },
  });

  redirect(launchUrl);
}
