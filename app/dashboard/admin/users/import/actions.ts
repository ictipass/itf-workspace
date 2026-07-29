"use server";

import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { importWorkspaceUsersFromCsv } from "@/lib/services/workspace-user-bulk-import.service";
import { syncItfFlowDirectory } from "@/lib/integrations/itf-flow-directory-sync";

export type ImportUsersState = {
  success: boolean;
  message: string;
  errors?: string[];
  createdCount?: number;
  devLogPath?: string;
};

export async function importUsersAction(
  _prevState: ImportUsersState,
  formData: FormData
): Promise<ImportUsersState> {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    return {
      success: false,
      message: "Only System Administrators can import users.",
    };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return {
      success: false,
      message: "Please upload a CSV file.",
    };
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return {
      success: false,
      message: "Only CSV files are currently supported.",
    };
  }

  const csvText = await file.text();

  const result = await importWorkspaceUsersFromCsv({
    csvText,
    importedById: user.id,
    dryRun: formData.get("dryRun") === "on",
  });

  if (!result.success) {
    return {
      success: false,
      message:
        "Import failed. No user was created. Please fix the errors and try again.",
      errors: result.errors,
    };
  }

  return {
    success: true,
    message: result.dryRun
      ? `Dry run passed. ${result.validatedCount} row(s) are ready to import; no data was changed.`
      : `${result.createdCount} user(s) created successfully.`,
    createdCount: result.createdCount,
    devLogPath: result.devLogPath,
  };
}

export type DirectorySyncState = {
  success: boolean;
  message: string;
};

export async function syncItfFlowDirectoryAction(
  _previousState: DirectorySyncState,
): Promise<DirectorySyncState> {
  void _previousState;
  const user = await requireCurrentUser();
  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    return { success: false, message: "Only System Administrators can synchronize ITF Flow." };
  }

  try {
    const result = await syncItfFlowDirectory();
    return {
      success: true,
      message: `Synchronized ${result.totalCount} entitled user(s) in ${result.batchCount} batch(es): ${result.createdCount} created, ${result.updatedCount} updated, ${result.inactiveCount} inactive.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "ITF Flow synchronization failed.",
    };
  }
}
