import { NextResponse } from "next/server";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const csv = [
    "staffNumber,fullName,email,workspaceRole,officeCode,departmentCode,divisionCode,unitCode,positionCode,supervisorStaffNumber,itfFlowRole",
    "ITF00123,Amina Bala,amina.bala@itf.gov.ng,STAFF,HQ,ICT,PASS,SOFTWARE_SUPPORT,SERVICE_OFFICER,ITF00120,OFFICER",
    "ITF00120,John Okafor,john.okafor@itf.gov.ng,STAFF,HQ,ICT,PASS,SOFTWARE_SUPPORT,UNIT_HEAD,ITF00110,UNIT_HEAD",
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="workspace-user-import-template.csv"',
    },
  });
}
