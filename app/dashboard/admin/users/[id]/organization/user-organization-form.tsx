"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserOrganizationAction } from "./actions";

type Reference = { id: string; code: string; name: string };
type References = {
  offices: Reference[];
  departments: (Reference & { officeId: string | null })[];
  divisions: (Reference & { departmentId: string })[];
  units: (Reference & { divisionId: string | null })[];
  positions: Reference[];
};

type UserOrganizationFormProps = {
  references: References;
  user: {
    id: string;
    officeId: string | null;
    departmentId: string | null;
    divisionId: string | null;
    unitId: string | null;
    positionId: string | null;
    supervisorId: string | null;
    supervisorStaffNumber: string;
  };
};

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function UserOrganizationForm({ references, user }: UserOrganizationFormProps) {
  const [officeId, setOfficeId] = useState(user.officeId ?? "");
  const [departmentId, setDepartmentId] = useState(user.departmentId ?? "");
  const [divisionId, setDivisionId] = useState(user.divisionId ?? "");
  const [unitId, setUnitId] = useState(user.unitId ?? "");
  const [positionId, setPositionId] = useState(user.positionId ?? "");

  const departments = references.departments.filter(
    (item) => item.officeId === null || item.officeId === officeId
  );
  const divisions = references.divisions.filter((item) => item.departmentId === departmentId);
  const units = references.units.filter((item) => Boolean(divisionId) && item.divisionId === divisionId);
  const options = (items: Reference[]) =>
    items.map((item) => (
      <option key={item.id} value={item.id}>
        {item.name} ({item.code})
      </option>
    ));

  return (
    <form action={updateUserOrganizationAction} className="grid max-w-3xl gap-5">
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="expectedOfficeId" value={user.officeId ?? "NONE"} />
      <input type="hidden" name="expectedDepartmentId" value={user.departmentId ?? "NONE"} />
      <input type="hidden" name="expectedDivisionId" value={user.divisionId ?? "NONE"} />
      <input type="hidden" name="expectedUnitId" value={user.unitId ?? "NONE"} />
      <input type="hidden" name="expectedPositionId" value={user.positionId ?? "NONE"} />
      <input type="hidden" name="expectedSupervisorId" value={user.supervisorId ?? "NONE"} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="officeId">Office</Label><select id="officeId" name="officeId" className={selectClass} value={officeId} required onChange={(event) => { setOfficeId(event.target.value); setDepartmentId(""); setDivisionId(""); setUnitId(""); }}><option value="">Select office</option>{options(references.offices)}</select></div>
        <div className="space-y-2"><Label htmlFor="departmentId">Department</Label><select id="departmentId" name="departmentId" className={selectClass} value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setDivisionId(""); setUnitId(""); }}><option value="">None</option>{options(departments)}</select></div>
        <div className="space-y-2"><Label htmlFor="divisionId">Division</Label><select id="divisionId" name="divisionId" className={selectClass} value={divisionId} disabled={!departmentId} onChange={(event) => { setDivisionId(event.target.value); setUnitId(""); }}><option value="">None</option>{options(divisions)}</select></div>
        <div className="space-y-2"><Label htmlFor="unitId">Unit</Label><select id="unitId" name="unitId" className={selectClass} value={unitId} disabled={!divisionId} onChange={(event) => setUnitId(event.target.value)}><option value="">None</option>{options(units)}</select></div>
        <div className="space-y-2"><Label htmlFor="positionId">Position</Label><select id="positionId" name="positionId" className={selectClass} value={positionId} onChange={(event) => setPositionId(event.target.value)}><option value="">None</option>{options(references.positions)}</select></div>
        <div className="space-y-2"><Label htmlFor="supervisorStaffNumber">Supervisor staff number</Label><Input id="supervisorStaffNumber" name="supervisorStaffNumber" defaultValue={user.supervisorStaffNumber} maxLength={100} placeholder="Leave blank to remove the supervisor" /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="sourceReference">HR source reference</Label><Input id="sourceReference" name="sourceReference" required minLength={3} maxLength={200} placeholder="Approved HR record or instruction reference" /></div>
      <div className="space-y-2"><Label htmlFor="reason">Reason for correction</Label><textarea id="reason" name="reason" required minLength={10} maxLength={500} className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Explain the approved organizational correction" /></div>
      <p className="text-sm text-muted-foreground">Fresh authenticator verification is required. The correction is audited and becomes available to ITF Flow after directory synchronization.</p>
      <Button type="submit">Save organizational details</Button>
    </form>
  );
}
