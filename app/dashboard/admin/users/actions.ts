"use server";

import { revalidatePath } from "next/cache";
import {
  AuditAction,
  UserStatus,
  WorkspaceRole,
  WorkspaceSessionRevocationReason,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import {
  deliverItfFlowSessionEvents,
  enqueueEntitlementRevocationEvents,
  revokeWorkspaceSessionsInTransaction,
} from "@/lib/integrations/itf-flow-session-events";

async function requireSystemAdmin() {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function deactivateUserAction(formData: FormData) {
  const actor = await requireSystemAdmin();
  const id = String(formData.get("id") || "");

  if (!id) throw new Error("User ID is required.");

  if (actor.id === id) {
    throw new Error("You cannot deactivate your own account.");
  }

  const eventIds = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
    });
    const revoked = await revokeWorkspaceSessionsInTransaction(
      transaction,
      { userId: id },
      WorkspaceSessionRevocationReason.ACCOUNT_DEACTIVATED
    );
    const activeAccesses = await transaction.appAccess.findMany({
      where: { userId: id, status: "ACTIVE" },
      select: { app: { select: { slug: true } } },
    });
    const entitlementEvents = await enqueueEntitlementRevocationEvents(
      transaction,
      activeAccesses.map((access) => ({
        workspaceUserId: id,
        appSlug: access.app.slug,
        reason: "ACCOUNT_DEACTIVATED",
      }))
    );
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: AuditAction.USER_UPDATED,
        metadata: { userId: user.id, email: user.email, updateType: "USER_DEACTIVATED", sessionsRevoked: true },
      },
    });
    return [...revoked.eventIds, ...entitlementEvents];
  });
  await deliverItfFlowSessionEvents(eventIds);

  revalidatePath("/dashboard/admin/users");
}

export async function activateUserAction(formData: FormData) {
  const actor = await requireSystemAdmin();
  const id = String(formData.get("id") || "");

  if (!id) throw new Error("User ID is required.");

  const user = await prisma.user.update({
    where: { id },
    data: { status: UserStatus.ACTIVE },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: AuditAction.USER_UPDATED,
      metadata: {
        userId: user.id,
        email: user.email,
        updateType: "USER_ACTIVATED",
      },
    },
  });

  revalidatePath("/dashboard/admin/users");
}
