import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffForm } from "./staff-form";

export default async function NewStaffPage() {
  const actor = await requireCurrentUser();
  if (actor.workspaceRole !== WorkspaceRole.SYSTEM_ADMIN) redirect("/dashboard");
  const select = { id: true, code: true, name: true } as const;
  const [offices, departments, divisions, units, positions] = await Promise.all([
    prisma.office.findMany({ where: { isActive: true }, select, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { isActive: true }, select: { ...select, officeId: true }, orderBy: { name: "asc" } }),
    prisma.division.findMany({ where: { isActive: true }, select: { ...select, departmentId: true }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { isActive: true }, select: { ...select, divisionId: true }, orderBy: { name: "asc" } }),
    prisma.position.findMany({ where: { isActive: true }, select: { id: true, code: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Add Staff</h1><p className="mt-2 text-muted-foreground">Enter one HR-confirmed staff record without a spreadsheet. Privileged Workspace roles and app access are not granted here.</p></div><Card><CardHeader><CardTitle>Ordinary staff account</CardTitle></CardHeader><CardContent><StaffForm references={{ offices, departments, divisions, units, positions: positions.map((item) => ({ id: item.id, code: item.code, name: item.title })) }} /></CardContent></Card></div>;
}
