import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  createOrganizationWorkbook,
  type WorkbookExportData,
} from "@/lib/organization-import/workbook";

export async function GET(request: NextRequest) {
  const user = await requireCurrentUser();
  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mode = request.nextUrl.searchParams.get("mode");
  if (mode !== "template" && mode !== "current") {
    return NextResponse.json({ error: "mode must be template or current" }, { status: 400 });
  }

  const empty: WorkbookExportData = {
    offices: [], departments: [], divisions: [], units: [], positions: [],
  };
  let data = empty;
  if (mode === "current") {
    const [offices, departments, divisions, units, positions] = await Promise.all([
      prisma.office.findMany({ orderBy: { code: "asc" } }),
      prisma.department.findMany({ include: { office: true }, orderBy: { code: "asc" } }),
      prisma.division.findMany({ include: { department: { include: { office: true } } }, orderBy: { code: "asc" } }),
      prisma.unit.findMany({ include: { division: { include: { department: { include: { office: true } } } } }, orderBy: { code: "asc" } }),
      prisma.position.findMany({ orderBy: { code: "asc" } }),
    ]);
    data = {
      offices: offices.map((item) => ({ id: item.id, code: item.code, name: item.name, type: item.type, isActive: item.isActive })),
      departments: departments.map((item) => ({ id: item.id, code: item.code, name: item.name, officeCode: item.office?.code ?? "", isActive: item.isActive })),
      divisions: divisions.map((item) => ({ id: item.id, code: item.code, name: item.name, officeCode: item.department.office?.code ?? "", departmentCode: item.department.code, isActive: item.isActive })),
      units: units.map((item) => ({ id: item.id, code: item.code, name: item.name, officeCode: item.division?.department.office?.code ?? "", departmentCode: item.division?.department.code ?? "", divisionCode: item.division?.code ?? "", isActive: item.isActive })),
      positions: positions.map((item) => ({ id: item.id, code: item.code, title: item.title, isActive: item.isActive })),
    };
  }

  const workbook = await createOrganizationWorkbook(data);
  return new NextResponse(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="itf-workspace-organization-${mode}.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
