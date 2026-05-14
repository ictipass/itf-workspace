import { redirect } from "next/navigation";
import { AppAccessStatus, AppStatus, AuditAction } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";

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

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: AuditAction.APP_OPENED,
      metadata: {
        appId: access.app.id,
        appName: access.app.name,
        appUrl: access.app.url,
      },
    },
  });

  redirect(access.app.url);
}