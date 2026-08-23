"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AppAccessStatus,
  AuditAction,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, requireFreshMfaContext } from "@/lib/auth/current-user";
import {
  deliverItfFlowSessionEvents,
  enqueueEntitlementRevocationEvent,
} from "@/lib/integrations/itf-flow-session-events";

const grantAccessSchema = z.object({
  userId: z.string().min(1, "Please select a user."),
  entitlement: z.string().regex(/^[^:]+:[A-Z0-9_-]+$/, "Please select an application role."),
});

const revokeAccessSchema = z.object({
  accessId: z.string().min(1),
});

export type AccessActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function grantAppAccessAction(
  _prevState: AccessActionState,
  formData: FormData
): Promise<AccessActionState> {
  const currentUser = await requireCurrentUser();

  if (currentUser.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    return {
      success: false,
      message: "Only System Administrators can grant app access.",
    };
  }
  try {
    await requireFreshMfaContext();
  } catch {
    return { success: false, message: "Fresh TOTP verification is required to grant app access." };
  }

  const parsed = grantAccessSchema.safeParse({
    userId: formData.get("userId"),
    entitlement: formData.get("entitlement"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId, entitlement } = parsed.data;
  const separator = entitlement.indexOf(":");
  const appId = entitlement.slice(0, separator);
  const appRole = entitlement.slice(separator + 1);

  const [targetUser, app, rolePolicy] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.app.findUnique({ where: { id: appId } }),
    prisma.appRolePolicy.findUnique({
      where: { appId_roleCode: { appId, roleCode: appRole } },
    }),
  ]);

  if (!targetUser) {
    return { success: false, message: "Selected user does not exist." };
  }

  if (!app) {
    return { success: false, message: "Selected app does not exist." };
  }
  if (!rolePolicy?.isActive) {
    return { success: false, message: "Selected app role is not active or classified." };
  }

  const access = await prisma.appAccess.upsert({
    where: {
      userId_appId: {
        userId,
        appId,
      },
    },
    update: {
      appRole,
      status: AppAccessStatus.ACTIVE,
      grantedById: currentUser.id,
      grantedAt: new Date(),
      revokedAt: null,
    },
    create: {
      userId,
      appId,
      appRole,
      status: AppAccessStatus.ACTIVE,
      grantedById: currentUser.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: currentUser.id,
      action: AuditAction.ACCESS_GRANTED,
      metadata: {
        accessId: access.id,
        userId,
        appId,
        appRole,
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/apps");
  revalidatePath("/dashboard/admin/access");

  return {
    success: true,
    message: "App access granted successfully.",
  };
}

export async function revokeAppAccessAction(
  formData: FormData
): Promise<void> {
  const currentUser = await requireCurrentUser();

  if (currentUser.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    throw new Error("Unauthorized");
  }
  await requireFreshMfaContext();

  const parsed = revokeAccessSchema.safeParse({
    accessId: formData.get("accessId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid access record.");
  }

  const eventIds = await prisma.$transaction(async (transaction) => {
    const access = await transaction.appAccess.update({
      where: { id: parsed.data.accessId },
      data: { status: AppAccessStatus.REVOKED, revokedAt: new Date() },
      include: { app: { select: { slug: true } } },
    });
    const queued = await enqueueEntitlementRevocationEvent(transaction, {
      workspaceUserId: access.userId,
      appSlug: access.app.slug,
      reason: "ACCESS_REVOKED",
    });
    await transaction.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: AuditAction.ACCESS_REVOKED,
        metadata: {
          accessId: access.id,
          userId: access.userId,
          appId: access.appId,
          revocationEventQueued: queued.length === 1,
        },
      },
    });
    return queued;
  });
  await deliverItfFlowSessionEvents(eventIds);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/apps");
  revalidatePath("/dashboard/admin/access");
}
