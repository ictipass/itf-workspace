"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AppCategory,
  AppEnvironment,
  AppStatus,
  AuditAction,
  WorkspaceRole,
  AssuranceRequirement,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, requireFreshMfaContext } from "@/lib/auth/current-user";
import { normalizeAppLaunchUrl } from "@/lib/apps/launch-url";
import {
  deliverItfFlowSessionEvents,
  enqueueCentralLogoutForWorkspaceUsers,
  enqueueEntitlementRevocationEvents,
  isItfFlowAppSlug,
} from "@/lib/integrations/itf-flow-session-events";

const appLaunchUrlSchema = z.string().trim().min(1).refine(
  (value) => {
    try {
      normalizeAppLaunchUrl(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Enter a valid http or https URL." }
);

const appSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  url: appLaunchUrlSchema,
  icon: z.string().optional(),
  category: z.nativeEnum(AppCategory),
  environment: z.nativeEnum(AppEnvironment),
  status: z.nativeEnum(AppStatus),
  assuranceRequirement: z.nativeEnum(AssuranceRequirement),
  launchAudience: z.string().trim().min(2).max(200),
  initialRoleCode: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/),
  initialRoleAssurance: z.nativeEnum(AssuranceRequirement),
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
  try {
    await requireFreshMfaContext();
  } catch {
    return { success: false, message: "Fresh TOTP verification is required to create an application." };
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
    assuranceRequirement: formData.get("assuranceRequirement"),
    launchAudience: formData.get("launchAudience"),
    initialRoleCode: formData.get("initialRoleCode"),
    initialRoleAssurance: formData.get("initialRoleAssurance"),
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

  const { initialRoleCode, initialRoleAssurance, ...appData } = parsed.data;
  await prisma.$transaction(async (transaction) => {
    const created = await transaction.app.create({
      data: {
        ...appData,
        url: normalizeAppLaunchUrl(appData.url),
      },
    });
    await transaction.appRolePolicy.create({
      data: {
        appId: created.id,
        roleCode: initialRoleCode.toUpperCase(),
        assuranceRequirement: initialRoleAssurance,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.APP_CREATED,
        metadata: { appId: created.id, appName: created.name, assuranceRequirement: created.assuranceRequirement },
      },
    });
    return created;
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/apps");

  return {
    success: true,
    message: "App registered successfully.",
  };
}


const updateAppSchema = appSchema.omit({ initialRoleCode: true, initialRoleAssurance: true }).extend({ id: z.string().min(1) });

export async function updateAppAction(
  _prevState: AppActionState,
  formData: FormData
): Promise<AppActionState> {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    return { success: false, message: "Only System Administrators can update apps." };
  }
  try {
    await requireFreshMfaContext();
  } catch {
    return { success: false, message: "Fresh TOTP verification is required to update an application." };
  }

  const parsed = updateAppSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    url: formData.get("url"),
    icon: formData.get("icon") || undefined,
    category: formData.get("category"),
    environment: formData.get("environment"),
    status: formData.get("status"),
    assuranceRequirement: formData.get("assuranceRequirement"),
    launchAudience: formData.get("launchAudience"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, ...data } = parsed.data;

  const eventIds = await prisma.$transaction(async (transaction) => {
    const previous = await transaction.app.findUnique({
      where: { id },
      include: {
        accessRules: { where: { status: "ACTIVE" }, select: { userId: true } },
      },
    });
    if (!previous) throw new Error("Application not found.");
    const app = await transaction.app.update({
      where: { id },
      data: { ...data, url: normalizeAppLaunchUrl(data.url) },
    });
    let queued: string[] = [];
    if (previous.status === AppStatus.ACTIVE && app.status === AppStatus.INACTIVE) {
      queued = await enqueueEntitlementRevocationEvents(
            transaction,
            previous.accessRules.map((access) => ({
              workspaceUserId: access.userId,
              appSlug: previous.slug,
              reason: "APP_DEACTIVATED",
            }))
          );
    } else if (
      previous.assuranceRequirement === AssuranceRequirement.STANDARD &&
      app.assuranceRequirement === AssuranceRequirement.SENSITIVE &&
      isItfFlowAppSlug(previous.slug)
    ) {
      queued = await enqueueCentralLogoutForWorkspaceUsers(
        transaction,
        previous.accessRules.map((access) => access.userId),
        "APP_ASSURANCE_INCREASED"
      );
    }
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.APP_UPDATED,
        metadata: {
          appId: app.id,
          appName: app.name,
          updateType: "APP_EDITED",
          revocationEventsQueued: queued.length,
        },
      },
    });
    return queued;
  });
  await deliverItfFlowSessionEvents(eventIds);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/apps");
  revalidatePath("/dashboard/admin/apps");

  return { success: true, message: "App updated successfully." };
}

export async function deactivateAppAction(formData: FormData) {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    throw new Error("Unauthorized");
  }
  await requireFreshMfaContext();

  const id = String(formData.get("id") || "");

  if (!id) {
    throw new Error("App ID is required.");
  }

  const eventIds = await prisma.$transaction(async (transaction) => {
    const app = await transaction.app.update({
      where: { id },
      data: { status: AppStatus.INACTIVE },
      include: {
        accessRules: {
          where: { status: "ACTIVE" },
          select: { userId: true },
        },
      },
    });
    const queued = await enqueueEntitlementRevocationEvents(
      transaction,
      app.accessRules.map((access) => ({
        workspaceUserId: access.userId,
        appSlug: app.slug,
        reason: "APP_DEACTIVATED",
      }))
    );
    await transaction.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.APP_UPDATED,
        metadata: {
          appId: app.id,
          appName: app.name,
          updateType: "APP_DEACTIVATED",
          revocationEventsQueued: queued.length,
        },
      },
    });
    return queued;
  });
  await deliverItfFlowSessionEvents(eventIds);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/apps");
  revalidatePath("/dashboard/admin/apps");
}

const rolePolicySchema = z.object({
  appId: z.string().min(1),
  roleCode: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/),
  assuranceRequirement: z.nativeEnum(AssuranceRequirement),
});

export async function upsertAppRolePolicyAction(formData: FormData) {
  const context = await requireFreshMfaContext();
  if (context.user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) throw new Error("Unauthorized");
  const parsed = rolePolicySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("A valid role code and assurance classification are required.");
  const roleCode = parsed.data.roleCode.toUpperCase();
  const result = await prisma.$transaction(async (transaction) => {
    const [existing, app] = await Promise.all([
      transaction.appRolePolicy.findUnique({
        where: { appId_roleCode: { appId: parsed.data.appId, roleCode } },
      }),
      transaction.app.findUnique({ where: { id: parsed.data.appId }, select: { slug: true } }),
    ]);
    if (!app) throw new Error("Application not found.");
    const policy = await transaction.appRolePolicy.upsert({
      where: { appId_roleCode: { appId: parsed.data.appId, roleCode } },
      create: { appId: parsed.data.appId, roleCode, assuranceRequirement: parsed.data.assuranceRequirement },
      update: { assuranceRequirement: parsed.data.assuranceRequirement, isActive: true },
    });
    let eventIds: string[] = [];
    if (
      existing?.assuranceRequirement === AssuranceRequirement.STANDARD &&
      policy.assuranceRequirement === AssuranceRequirement.SENSITIVE &&
      isItfFlowAppSlug(app.slug)
    ) {
      const accesses = await transaction.appAccess.findMany({
        where: { appId: policy.appId, appRole: roleCode, status: "ACTIVE" },
        select: { userId: true },
      });
      eventIds = await enqueueCentralLogoutForWorkspaceUsers(
        transaction,
        accesses.map((access) => access.userId),
        "ROLE_ASSURANCE_INCREASED"
      );
    }
    await transaction.auditLog.create({
      data: {
        actorId: context.user.id,
        action: existing ? AuditAction.APP_ROLE_POLICY_UPDATED : AuditAction.APP_ROLE_POLICY_CREATED,
        metadata: {
          appId: policy.appId,
          roleCode,
          assuranceRequirement: policy.assuranceRequirement,
          sessionEventsQueued: eventIds.length,
        },
      },
    });
    return { policy, eventIds };
  });
  await deliverItfFlowSessionEvents(result.eventIds);
  revalidatePath(`/dashboard/admin/apps/${result.policy.appId}/edit`);
  revalidatePath("/dashboard/admin/access");
}
