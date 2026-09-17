"use server";

import { revalidatePath } from "next/cache";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser, requireFreshMfaContext } from "@/lib/auth/current-user";
import { singleStaffSchema } from "@/lib/policies/single-staff-onboarding";
import { createWorkspaceStaff } from "@/lib/services/workspace-user-bulk-import.service";

export type CreateStaffState = {
  success: boolean;
  message: string;
  errors?: string[];
  needsMfa?: boolean;
};

export async function createStaffAction(
  _previousState: CreateStaffState,
  formData: FormData,
): Promise<CreateStaffState> {
  const actor = await requireCurrentUser();
  if (actor.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    return { success: false, message: "Only System Administrators can add staff." };
  }
  const fields = ["staffNumber", "fullName", "email", "officeCode", "departmentCode", "divisionCode", "unitCode", "positionCode", "supervisorStaffNumber", "sourceReference", "hrConfirmed"];
  // Reject attempts to use this entry point to grant privileged or child-app roles.
  if (formData.has("workspaceRole") || formData.has("itfFlowRole") || formData.has("appRole")) {
    return { success: false, message: "This form creates ordinary STAFF only. Grant app access separately." };
  }
  const parsed = singleStaffSchema.safeParse(Object.fromEntries(fields.map((field) => [field, formData.get(field) ?? ""])));
  if (!parsed.success) {
    return { success: false, message: "Check the staff details and HR confirmation.", errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
  }
  try {
    await requireFreshMfaContext();
  } catch (error) {
    if (error instanceof Error && error.message === "FRESH_MFA_REQUIRED") {
      return { success: false, needsMfa: true, message: "Verify your authenticator, then return and submit the reviewed details again." };
    }
    throw error;
  }
  const { sourceReference, hrConfirmed, ...staff } = parsed.data;
  void hrConfirmed;
  try {
    const result = await createWorkspaceStaff({
      rows: [{ ...staff, workspaceRole: WorkspaceRole.STAFF }],
      importedById: actor.id,
      mode: "SINGLE_USER",
      sourceReference,
    });
    if (!result.success) return { success: false, message: "No staff account was created. Correct the reported details.", errors: result.errors };
    revalidatePath("/dashboard/admin/users");
    return {
      success: true,
      message: result.deliveryFailedCount
        ? "Staff account created, but welcome email delivery failed. Do not add the user again; escalate delivery/reissue through the approved support process."
        : process.env.NODE_ENV === "production"
          ? "Staff account created and welcome email accepted by the mail provider. Grant approved app access separately, then synchronize Flow before launch."
          : "Staff account created. Development credentials were written to the existing protected development log. Grant app access separately.",
    };
  } catch {
    return { success: false, message: "Creation could not be confirmed. Check the user directory and audit log before retrying; the staff number/email may already exist." };
  }
}
