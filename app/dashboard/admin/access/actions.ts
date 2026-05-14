"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AppAccessStatus,
  AuditAction,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";

const grantAccessSchema = z.object({
  userId: z.string().min(1, "Please select a user."),
  appId: z.string().min(1, "Please select an app."),
  appRole: z.string().optional(),
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

  const parsed = grantAccessSchema.safeParse({
    userId: formData.get("userId"),
    appId: formData.get("appId"),
    appRole: formData.get("appRole") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId, appId, appRole } = parsed.data;

  const [targetUser, app] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.app.findUnique({ where: { id: appId } }),
  ]);

  if (!targetUser) {
    return { success: false, message: "Selected user does not exist." };
  }

  if (!app) {
    return { success: false, message: "Selected app does not exist." };
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

  const parsed = revokeAccessSchema.safeParse({
    accessId: formData.get("accessId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid access record.");
  }

  const access = await prisma.appAccess.update({
    where: {
      id: parsed.data.accessId,
    },
    data: {
      status: AppAccessStatus.REVOKED,
      revokedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: currentUser.id,
      action: AuditAction.ACCESS_REVOKED,
      metadata: {
        accessId: access.id,
        userId: access.userId,
        appId: access.appId,
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/apps");
  revalidatePath("/dashboard/admin/access");
}