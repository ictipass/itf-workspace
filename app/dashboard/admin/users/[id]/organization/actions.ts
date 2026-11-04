"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuditAction, UserStatus, WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser, requireFreshMfaContextOrRedirect } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { reportingLineCreatesCycle } from "@/lib/policies/reporting-line-reconciliation";
import { userOrganizationUpdateSchema } from "@/lib/policies/user-organization-update";

function organizationPath(userId: string, result?: string) {
  const path = `/dashboard/admin/users/${encodeURIComponent(userId)}/organization`;
  return result ? `${path}?result=${encodeURIComponent(result)}` : path;
}

function nullableExpected(value: string) {
  return value === "NONE" ? null : value;
}

export async function updateUserOrganizationAction(formData: FormData) {
  const actor = await requireCurrentUser();
  if (actor.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) throw new Error("Unauthorized");

  const userId = String(formData.get("userId") ?? "");
  await requireFreshMfaContextOrRedirect(organizationPath(userId, "step-up-complete"));
  const parsed = userOrganizationUpdateSchema.safeParse({
    userId,
    expectedOfficeId: formData.get("expectedOfficeId") ?? "",
    expectedDepartmentId: formData.get("expectedDepartmentId") ?? "",
    expectedDivisionId: formData.get("expectedDivisionId") ?? "",
    expectedUnitId: formData.get("expectedUnitId") ?? "",
    expectedPositionId: formData.get("expectedPositionId") ?? "",
    expectedSupervisorId: formData.get("expectedSupervisorId") ?? "",
    officeId: formData.get("officeId"),
    departmentId: formData.get("departmentId") ?? "",
    divisionId: formData.get("divisionId") ?? "",
    unitId: formData.get("unitId") ?? "",
    positionId: formData.get("positionId") ?? "",
    supervisorStaffNumber: formData.get("supervisorStaffNumber") ?? "",
    sourceReference: formData.get("sourceReference"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect(organizationPath(userId, "validation"));

  const input = parsed.data;
  const [target, office, department, division, unit, position] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.userId } }),
    prisma.office.findUnique({ where: { id: input.officeId } }),
    input.departmentId ? prisma.department.findUnique({ where: { id: input.departmentId } }) : null,
    input.divisionId ? prisma.division.findUnique({ where: { id: input.divisionId } }) : null,
    input.unitId ? prisma.unit.findUnique({ where: { id: input.unitId } }) : null,
    input.positionId ? prisma.position.findUnique({ where: { id: input.positionId } }) : null,
  ]);
  if (!target) redirect("/dashboard/admin/users");
  if (
    !office?.isActive ||
    (department && (!department.isActive || (department.officeId && department.officeId !== office.id))) ||
    (division && (!division.isActive || !department || division.departmentId !== department.id)) ||
    (unit && (!unit.isActive || !division || unit.divisionId !== division.id)) ||
    (position && !position.isActive)
  ) {
    redirect(organizationPath(target.id, "invalid-organization"));
  }

  const supervisor = input.supervisorStaffNumber
    ? await prisma.user.findUnique({ where: { staffNumber: input.supervisorStaffNumber } })
    : null;
  if (input.supervisorStaffNumber && (!supervisor || supervisor.status !== UserStatus.ACTIVE)) {
    redirect(organizationPath(target.id, "supervisor-not-found"));
  }
  if (supervisor?.id === target.id) redirect(organizationPath(target.id, "self"));

  const links = await prisma.user.findMany({ select: { id: true, supervisorId: true } });
  if (reportingLineCreatesCycle({
    targetUserId: target.id,
    proposedSupervisorId: supervisor?.id ?? null,
    supervisorByUserId: new Map(links.map((item) => [item.id, item.supervisorId])),
  })) {
    redirect(organizationPath(target.id, "cycle"));
  }

  if (
    target.officeId === office.id &&
    target.departmentId === (department?.id ?? null) &&
    target.divisionId === (division?.id ?? null) &&
    target.unitId === (unit?.id ?? null) &&
    target.positionId === (position?.id ?? null) &&
    target.supervisorId === (supervisor?.id ?? null)
  ) {
    redirect(organizationPath(target.id, "unchanged"));
  }

  const result = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.user.updateMany({
      where: {
        id: target.id,
        officeId: nullableExpected(input.expectedOfficeId),
        departmentId: nullableExpected(input.expectedDepartmentId),
        divisionId: nullableExpected(input.expectedDivisionId),
        unitId: nullableExpected(input.expectedUnitId),
        positionId: nullableExpected(input.expectedPositionId),
        supervisorId: nullableExpected(input.expectedSupervisorId),
      },
      data: {
        officeId: office.id,
        departmentId: department?.id ?? null,
        divisionId: division?.id ?? null,
        unitId: unit?.id ?? null,
        positionId: position?.id ?? null,
        supervisorId: supervisor?.id ?? null,
      },
    });
    if (!changed.count) return false;
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: AuditAction.USER_UPDATED,
        metadata: {
          userId: target.id,
          updateType: "ORGANIZATION_DETAILS_CORRECTED",
          sourceReference: input.sourceReference,
          reason: input.reason,
          flowDirectorySynchronizationRequired: true,
        },
      },
    });
    return true;
  });
  if (!result) redirect(organizationPath(target.id, "stale"));

  revalidatePath("/dashboard/admin/users");
  revalidatePath(organizationPath(target.id));
  redirect(organizationPath(target.id, "saved"));
}

// Retained for callers created before the broader organizational correction form.
export const updateReportingLineAction = updateUserOrganizationAction;
