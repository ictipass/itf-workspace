import { NextResponse } from "next/server";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  const escaped = text.replaceAll('"', '""');
  return `"${escaped}"`;
}

export async function GET() {
  const user = await requireCurrentUser();

  if (user.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [offices, departments, divisions, units, positions] = await Promise.all([
    prisma.office.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({
      include: { office: true },
      orderBy: { name: "asc" },
    }),
    prisma.division.findMany({
      include: {
        department: {
          include: {
            office: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.unit.findMany({
      include: {
        division: {
          include: {
            department: {
              include: {
                office: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({ orderBy: { title: "asc" } }),
  ]);

  const rows: string[][] = [
    [
      "type",
      "name",
      "code",
      "parentType",
      "parentName",
      "parentCode",
      "officeCode",
      "departmentCode",
      "divisionCode",
      "unitCode",
      "positionCode",
      "isActive",
    ],
  ];

  for (const office of offices) {
    rows.push([
      "OFFICE",
      office.name,
      office.code,
      "",
      "",
      "",
      office.code,
      "",
      "",
      "",
      "",
      office.isActive ? "true" : "false"
    ]);
  }

  for (const department of departments) {
    rows.push([
      "DEPARTMENT",
      department.name,
      department.code,
      "OFFICE",
      department.office?.name ?? "",
      department.office?.code ?? "",
      department.office?.code ?? "",
      department.code,
      "",
      "",
      "",
      department.isActive ? "true" : "false"
    ]);
  }

  for (const division of divisions) {
    rows.push([
      "DIVISION",
      division.name,
      division.code,
      "DEPARTMENT",
      division.department.name,
      division.department.code,
      division.department.office?.code ?? "",
      division.department.code,
      division.code,
      "",
      "",
      division.isActive ? "true" : "false"
    ]);
  }

  for (const unit of units) {
    rows.push([
      "UNIT",
      unit.name,
      unit.code,
      "DIVISION",
      unit.division?.name ?? "",
      unit.division?.code ?? "",
      unit.division?.department?.office?.code ?? "",
      unit.division?.department?.code ?? "",
      unit.division?.code ?? "",
      unit.code,
      "",
      unit.isActive ? "true" : "false"
    ]);
  }

  for (const position of positions) {
    rows.push([
      "POSITION",
      position.title,
      position.code,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      position.code,
      position.isActive ? "true" : "false"
    ]);
  }

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="itf-workspace-reference-codes.csv"',
    },
  });
}