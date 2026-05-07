"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AuditAction,
  OfficeType,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";

async function requireSystemAdmin() {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    throw new Error("Only System Administrators can manage setup data.");
  }

  return user;
}

export type SetupActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

const officeSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).toUpperCase(),
  type: z.nativeEnum(OfficeType),
});

export async function createOfficeAction(
  _prevState: SetupActionState,
  formData: FormData
): Promise<SetupActionState> {
  try {
    const user = await requireSystemAdmin();

    const parsed = officeSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      type: formData.get("type"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const exists = await prisma.office.findUnique({
      where: { code: parsed.data.code },
    });

    if (exists) {
      return { success: false, message: "Office code already exists." };
    }

    const office = await prisma.office.create({
      data: parsed.data,
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.APP_UPDATED,
        metadata: {
          module: "ORGANIZATION_SETUP",
          action: "OFFICE_CREATED",
          officeId: office.id,
          code: office.code,
        },
      },
    });

    revalidatePath("/dashboard/admin/setup");

    return { success: true, message: "Office created successfully." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create office.",
    };
  }
}

const departmentSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).toUpperCase(),
  officeId: z.string().min(1),
});

export async function createDepartmentAction(
  _prevState: SetupActionState,
  formData: FormData
): Promise<SetupActionState> {
  try {
    const user = await requireSystemAdmin();

    const parsed = departmentSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      officeId: formData.get("officeId"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const existing = await prisma.department.findUnique({
      where: {
        code_officeId: {
          code: parsed.data.code,
          officeId: parsed.data.officeId,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        message: "Department code already exists for this office.",
      };
    }

    const department = await prisma.department.create({
      data: parsed.data,
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.APP_UPDATED,
        metadata: {
          module: "ORGANIZATION_SETUP",
          action: "DEPARTMENT_CREATED",
          departmentId: department.id,
          code: department.code,
        },
      },
    });

    revalidatePath("/dashboard/admin/setup");

    return { success: true, message: "Department created successfully." };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create department.",
    };
  }
}

const divisionSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).toUpperCase(),
  departmentId: z.string().min(1),
});

export async function createDivisionAction(
  _prevState: SetupActionState,
  formData: FormData
): Promise<SetupActionState> {
  try {
    const user = await requireSystemAdmin();

    const parsed = divisionSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      departmentId: formData.get("departmentId"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const existing = await prisma.division.findUnique({
      where: {
        code_departmentId: {
          code: parsed.data.code,
          departmentId: parsed.data.departmentId,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        message: "Division code already exists for this department.",
      };
    }

    const division = await prisma.division.create({
      data: parsed.data,
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.APP_UPDATED,
        metadata: {
          module: "ORGANIZATION_SETUP",
          action: "DIVISION_CREATED",
          divisionId: division.id,
          code: division.code,
        },
      },
    });

    revalidatePath("/dashboard/admin/setup");

    return { success: true, message: "Division created successfully." };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create division.",
    };
  }
}

const unitSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).toUpperCase(),
  divisionId: z.string().optional(),
});

export async function createUnitAction(
  _prevState: SetupActionState,
  formData: FormData
): Promise<SetupActionState> {
  try {
    const user = await requireSystemAdmin();

    const parsed = unitSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      divisionId: formData.get("divisionId") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const existing = await prisma.unit.findFirst({
      where: {
        code: parsed.data.code,
        divisionId: parsed.data.divisionId,
      },
    });

    if (existing) {
      return {
        success: false,
        message: "Unit code already exists for this division.",
      };
    }

    const unit = await prisma.unit.create({
      data: parsed.data,
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.APP_UPDATED,
        metadata: {
          module: "ORGANIZATION_SETUP",
          action: "UNIT_CREATED",
          unitId: unit.id,
          code: unit.code,
        },
      },
    });

    revalidatePath("/dashboard/admin/setup");

    return { success: true, message: "Unit created successfully." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create unit.",
    };
  }
}

const positionSchema = z.object({
  title: z.string().min(2),
  code: z.string().min(2).toUpperCase(),
});

export async function createPositionAction(
  _prevState: SetupActionState,
  formData: FormData
): Promise<SetupActionState> {
  try {
    const user = await requireSystemAdmin();

    const parsed = positionSchema.safeParse({
      title: formData.get("title"),
      code: formData.get("code"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const exists = await prisma.position.findUnique({
      where: { code: parsed.data.code },
    });

    if (exists) {
      return { success: false, message: "Position code already exists." };
    }

    const position = await prisma.position.create({
      data: parsed.data,
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.APP_UPDATED,
        metadata: {
          module: "ORGANIZATION_SETUP",
          action: "POSITION_CREATED",
          positionId: position.id,
          code: position.code,
        },
      },
    });

    revalidatePath("/dashboard/admin/setup");

    return { success: true, message: "Position created successfully." };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create position.",
    };
  }
}