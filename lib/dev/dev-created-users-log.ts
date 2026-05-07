import fs from "fs/promises";
import path from "path";

type CreatedUserCredential = {
  staffNumber: string;
  fullName: string;
  email: string;
  workspaceRole: string;
  temporaryPassword: string;
  officeCode?: string | null;
  departmentCode?: string | null;
  divisionCode?: string | null;
  unitCode?: string | null;
  positionCode?: string | null;
};

export async function writeDevCreatedUsersLog(
  credentials: CreatedUserCredential[]
) {
  if (process.env.NODE_ENV === "production") return;

  const dir = path.join(process.cwd(), "storage");
  await fs.mkdir(dir, { recursive: true });

  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const filePath = path.join(dir, `dev-created-users-${timestamp}.json`);

  await fs.writeFile(filePath, JSON.stringify(credentials, null, 2), "utf8");

  return filePath;
}