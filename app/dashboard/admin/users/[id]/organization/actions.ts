"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuditAction, UserStatus, WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser, requireFreshMfaContextOrRedirect } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { reportingLineChangeSchema, reportingLineCreatesCycle } from "@/lib/policies/reporting-line-reconciliation";

function organizationPath(userId: string, result?: string) {
  const path = `/dashboard/admin/users/${encodeURIComponent(userId)}/organization`;
  return result ? `${path}?result=${encodeURIComponent(result)}` : path;
}

export async function updateReportingLineAction(formData: FormData) {
  const actor = await requireCurrentUser();
  if (actor.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) throw new Error("Unauthorized");

  const userId = String(formData.get("userId") ?? "");
  await requireFreshMfaContextOrRedirect(organizationPath(userId, "step-up-complete"));
  const parsed = reportingLineChangeSchema.safeParse({
    userId,
    expectedSupervisorId: formData.get("expectedSupervisorId"),
    supervisorStaffNumber: formData.get("supervisorStaffNumber"),
    sourceReference: formData.get("sourceReference"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect(organizationPath(userId, "validation"));

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) redirect("/dashboard/admin/users");
  if ((target.supervisorId ?? "NONE") !== parsed.data.expectedSupervisorId) {
    redirect(organizationPath(target.id, "stale"));
  }

  const proposedSupervisor = parsed.data.supervisorStaffNumber
    ? await prisma.user.findUnique({ where: { staffNumber: parsed.data.supervisorStaffNumber } })
    : null;
  if (parsed.data.supervisorStaffNumber && (!proposedSupervisor || proposedSupervisor.status !== UserStatus.ACTIVE)) {
    redirect(organizationPath(target.id, "supervisor-not-found"));
  }
  if (proposedSupervisor?.id === target.id) redirect(organizationPath(target.id, "self"));

  const links = await prisma.user.findMany({ select: { id: true, supervisorId: true } });
  if (reportingLineCreatesCycle({
    targetUserId: target.id,
    proposedSupervisorId: proposedSupervisor?.id ?? null,
    supervisorByUserId: new Map(links.map((item) => [item.id, item.supervisorId])),
  })) {
    redirect(organizationPath(target.id, "cycle"));
  }
  if (target.supervisorId === (proposedSupervisor?.id ?? null)) {
    redirect(organizationPath(target.id, "unchanged"));
  }

  const changed = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.user.updateMany({
      where: { id: target.id, supervisorId: target.supervisorId },
      data: { supervisorId: proposedSupervisor?.id ?? null },
    });
    if (!changed.count) return false;
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: AuditAction.USER_UPDATED,
        metadata: {
          userId: target.id,
          updateType: "REPORTING_LINE_CORRECTED",
          previousSupervisorId: target.supervisorId,
          nextSupervisorId: proposedSupervisor?.id ?? null,
          sourceReference: parsed.data.sourceReference,
          reason: parsed.data.reason,
          flowDirectorySynchronizationRequired: true,
        },
      },
    });
    return true;
  });
  if (!changed) redirect(organizationPath(target.id, "stale"));

  revalidatePath("/dashboard/admin/users");
  revalidatePath(organizationPath(target.id));
  redirect(organizationPath(target.id, "saved"));
}
