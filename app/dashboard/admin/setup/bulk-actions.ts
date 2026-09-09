"use server";

import { revalidatePath } from "next/cache";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import {
  requireCurrentUser,
  requireFreshMfaContext,
} from "@/lib/auth/current-user";
import { resolveWorkspaceOrganizationImportConfiguration } from "@/lib/config/workspace-environment";
import { parseOrganizationUpload, type OrganizationUploadFile } from "@/lib/organization-import/workbook";
import {
  issueOrganizationImportReceipt,
  verifyOrganizationImportReceipt,
} from "@/lib/organization-import/validation-receipt";
import {
  applyOrganizationImport,
  validateOrganizationImport,
  type OrganizationImportSummary,
} from "@/lib/services/organization-reference-import.service";

export type OrganizationImportActionState = {
  success: boolean;
  phase: "idle" | "validated" | "applied" | "error";
  message: string;
  errors?: string[];
  receipt?: string;
  digest?: string;
  summary?: OrganizationImportSummary;
  requiresFreshMfa?: boolean;
};

export const initialOrganizationImportState: OrganizationImportActionState = {
  success: false,
  phase: "idle",
  message: "",
};

function uploadedFiles(formData: FormData) {
  return formData
    .getAll("organizationFiles")
    .filter((value): value is File => value instanceof File && value.size > 0)
    .map((file) => file as OrganizationUploadFile);
}

export async function organizationImportAction(
  _previous: OrganizationImportActionState,
  formData: FormData
): Promise<OrganizationImportActionState> {
  try {
    const user = await requireCurrentUser();
    if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
      throw new Error("Only System Administrators can import organization data.");
    }

    const limits = resolveWorkspaceOrganizationImportConfiguration();
    const parsed = await parseOrganizationUpload(uploadedFiles(formData), limits);
    if (!parsed.success) {
      return {
        success: false,
        phase: "error",
        message: "The upload did not pass file and field validation.",
        errors: parsed.errors.slice(0, 100),
      };
    }

    const databaseValidation = await validateOrganizationImport(parsed.data);
    if (!databaseValidation.success) {
      return {
        success: false,
        phase: "error",
        message: "The upload conflicts with current organization data.",
        errors: databaseValidation.errors.slice(0, 100),
      };
    }

    const intent = String(formData.get("intent") || "validate");
    if (intent !== "apply") {
      return {
        success: true,
        phase: "validated",
        message:
          "Dry run passed. Review the summary, then reselect the unchanged file(s) and apply before the receipt expires.",
        receipt: issueOrganizationImportReceipt({
          userId: user.id,
          digest: parsed.digest,
          ttlSeconds: limits.validationReceiptSeconds,
        }),
        digest: parsed.digest,
        summary: databaseValidation.summary,
      };
    }

    const receipt = String(formData.get("validationReceipt") || "");
    if (
      !verifyOrganizationImportReceipt({
        receipt,
        userId: user.id,
        digest: parsed.digest,
      })
    ) {
      return {
        success: false,
        phase: "error",
        message:
          "The dry-run receipt is missing, expired, belongs to another administrator, or the file changed. Run the dry run again.",
      };
    }

    try {
      const freshContext = await requireFreshMfaContext();
      if (freshContext.user.id !== user.id) throw new Error("UNAUTHENTICATED");
    } catch (error) {
      if (error instanceof Error && error.message === "FRESH_MFA_REQUIRED") {
        return {
          success: false,
          phase: "error",
          message: "A fresh authenticator verification is required before applying this import.",
          requiresFreshMfa: true,
        };
      }
      throw error;
    }

    const summary = await applyOrganizationImport({
      data: parsed.data,
      actorId: user.id,
      digest: parsed.digest,
      source: parsed.source,
    });
    revalidatePath("/dashboard/admin/setup");
    revalidatePath("/dashboard/admin/users/import");

    return {
      success: true,
      phase: "applied",
      message:
        "Organization data was applied atomically. Download fresh reference codes before staff onboarding and synchronize affected child apps.",
      digest: parsed.digest,
      summary,
    };
  } catch (error) {
    return {
      success: false,
      phase: "error",
      message:
        error instanceof Error ? error.message : "Organization import failed safely.",
    };
  }
}
