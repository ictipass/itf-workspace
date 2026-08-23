"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { signOut } from "@/auth";
import { AuditAction, WorkspaceSessionRevocationReason } from "@/lib/generated/prisma/client";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters.")
      .regex(/[A-Z]/, "New password must include an uppercase letter.")
      .regex(/[a-z]/, "New password must include a lowercase letter.")
      .regex(/[0-9]/, "New password must include a number."),
    confirmPassword: z.string().min(1, "Confirm password is required."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const currentUser = await requireCurrentUser();

  const parsed = schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
  });

  if (!user || !user.passwordHash) {
    return {
      success: false,
      message: "User account not found.",
    };
  }

  const currentPasswordValid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );

  if (!currentPasswordValid) {
    return {
      success: false,
      message: "Current password is incorrect.",
    };
  }

  const isSamePassword = await bcrypt.compare(
    parsed.data.newPassword,
    user.passwordHash
  );

  if (isSamePassword) {
    return {
      success: false,
      message: "New password must be different from the temporary password.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: user.id },
      data: { passwordHash, isTemporaryPassword: false },
    });
    await transaction.workspaceSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: WorkspaceSessionRevocationReason.PASSWORD_CHANGED },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.USER_UPDATED,
        metadata: { type: "PASSWORD_CHANGED", sessionsRevoked: true },
      },
    });
  });

  await signOut({
    redirectTo: "/login?passwordChanged=1",
  });

  return {
    success: true,
    message: "Password changed successfully.",
  };
}
