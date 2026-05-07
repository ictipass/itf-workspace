"use server";

import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { importWorkspaceUsersFromCsv } from "@/lib/services/workspace-user-bulk-import.service";

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
    message: `${result.createdCount} user(s) created successfully.`,
    createdCount: result.createdCount,
    devLogPath: result.devLogPath,
  };
}