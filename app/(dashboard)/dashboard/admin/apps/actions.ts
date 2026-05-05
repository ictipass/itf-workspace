"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AppCategory,
  AppEnvironment,
  AppStatus,
  AuditAction,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";

const appSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  url: z.string().url(),
  icon: z.string().optional(),
  category: z.nativeEnum(AppCategory),
  environment: z.nativeEnum(AppEnvironment),
  status: z.nativeEnum(AppStatus),
});

export type AppActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function createAppAction(
  _prevState: AppActionState,
  formData: FormData
): Promise<AppActionState> {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    return { success: false, message: "Only System Administrators can create apps." };
  }

  const parsed = appSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    url: formData.get("url"),
    icon: formData.get("icon") || undefined,
    category: formData.get("category"),
    environment: formData.get("environment"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await prisma.app.findUnique({
    where: { slug: parsed.data.slug },
  });

  if (existing) {
    return {
      success: false,
      message: "An app with this slug already exists.",
    };
  }

  const app = await prisma.app.create({
    data: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: AuditAction.APP_CREATED,
      metadata: {
        appId: app.id,
        appName: app.name,
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/apps");

  return {
    success: true,
    message: "App registered successfully.",
  };
}