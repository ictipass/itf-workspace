import { NextResponse } from "next/server";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const csv = [
    "staffNumber,fullName,email,workspaceRole,officeCode,departmentCode,divisionCode,unitCode,positionCode",
    "ITF00123,Amina Bala,amina.bala@itf.gov.ng,STAFF,HQ,ICT,PASS,SOFTWARE_SUPPORT,SERVICE_OFFICER",
    "ITF00124,John Okafor,john.okafor@itf.gov.ng,APP_ADMIN,HQ,ICT,HARDWARE,HARDWARE_SUPPORT,SERVICE_OFFICER",
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="workspace-user-import-template.csv"',
    },
  });
}