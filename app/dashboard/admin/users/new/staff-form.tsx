"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStaffAction } from "./actions";

type Reference = { id: string; code: string; name: string };
type References = {
  offices: Reference[];
  departments: (Reference & { officeId: string | null })[];
  divisions: (Reference & { departmentId: string })[];
  units: (Reference & { divisionId: string | null })[];
  positions: Reference[];
};

export function StaffForm({ references }: { references: References }) {
  const [state, action, pending] = useActionState(createStaffAction, { success: false, message: "" });
  const [office, setOffice] = useState("");
  const [department, setDepartment] = useState("");
  const [division, setDivision] = useState("");
  const [unit, setUnit] = useState("");
  const [position, setPosition] = useState("");
  const [hrConfirmed, setHrConfirmed] = useState(false);
  const [details, setDetails] = useState({ staffNumber: "", fullName: "", email: "", supervisorStaffNumber: "", sourceReference: "" });
  const detailInput = (field: keyof typeof details) => ({ value: details[field], onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDetails((current) => ({ ...current, [field]: event.target.value })) });
  const officeId = references.offices.find((item) => item.code === office)?.id;
  const departmentId = references.departments.find((item) => item.code === department && item.officeId === officeId)?.id;
  const divisionId = references.divisions.find((item) => item.code === division && item.departmentId === departmentId)?.id;
  const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
  const options = (items: Reference[]) => items.map((item) => <option key={item.id} value={item.code}>{item.name} ({item.code})</option>);
  return (
    <form action={action} className="space-y-5">
      <fieldset disabled={pending || state.success} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="staffNumber">Staff number</Label><Input id="staffNumber" name="staffNumber" {...detailInput("staffNumber")} maxLength={100} required placeholder="Preserve leading zeroes" /></div>
          <div className="space-y-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" name="fullName" {...detailInput("fullName")} maxLength={300} required /></div>
          <div className="space-y-2"><Label htmlFor="email">Official email</Label><Input id="email" name="email" {...detailInput("email")} type="email" maxLength={320} required /></div>
          <div className="space-y-2"><Label htmlFor="officeCode">Office</Label><select id="officeCode" name="officeCode" className={selectClass} required value={office} onChange={(event) => { setOffice(event.target.value); setDepartment(""); setDivision(""); setUnit(""); }}><option value="">Select office</option>{options(references.offices)}</select></div>
          <div className="space-y-2"><Label htmlFor="departmentCode">Department (optional)</Label><select id="departmentCode" name="departmentCode" className={selectClass} value={department} onChange={(event) => { setDepartment(event.target.value); setDivision(""); setUnit(""); }}><option value="">None</option>{options(references.departments.filter((item) => item.officeId === officeId))}</select></div>
          <div className="space-y-2"><Label htmlFor="divisionCode">Division (optional)</Label><select id="divisionCode" name="divisionCode" className={selectClass} value={division} onChange={(event) => { setDivision(event.target.value); setUnit(""); }}><option value="">None</option>{options(references.divisions.filter((item) => item.departmentId === departmentId))}</select></div>
          <div className="space-y-2"><Label htmlFor="unitCode">Unit (optional)</Label><select id="unitCode" name="unitCode" className={selectClass} value={unit} onChange={(event) => setUnit(event.target.value)}><option value="">None</option>{options(references.units.filter((item) => Boolean(divisionId) && item.divisionId === divisionId))}</select></div>
          <div className="space-y-2"><Label htmlFor="positionCode">Position (optional)</Label><select id="positionCode" name="positionCode" className={selectClass} value={position} onChange={(event) => setPosition(event.target.value)}><option value="">None</option>{options(references.positions)}</select></div>
          <div className="space-y-2"><Label htmlFor="supervisorStaffNumber">Supervisor staff number (optional)</Label><Input id="supervisorStaffNumber" name="supervisorStaffNumber" {...detailInput("supervisorStaffNumber")} maxLength={100} placeholder="Must already exist" /></div>
          <div className="space-y-2"><Label htmlFor="sourceReference">HR source reference</Label><Input id="sourceReference" name="sourceReference" {...detailInput("sourceReference")} maxLength={300} required placeholder="Approved HR list or instruction reference" /></div>
        </div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="hrConfirmed" required checked={hrConfirmed} onChange={(event) => setHrConfirmed(event.target.checked)} className="mt-1" /><span>I confirm these details are from the HR-authoritative staff list. This creates an ordinary STAFF account only.</span></label>
        <Button type="submit">{pending ? "Creating staff…" : "Add staff and send welcome"}</Button>
      </fieldset>
      {state.message && <div role="status" aria-live="polite" className="rounded-md border p-4 text-sm"><p>{state.message}</p>{state.errors && <ul className="mt-2 list-disc pl-5">{state.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}</div>}
      {state.needsMfa && <Button asChild variant="outline"><Link href="/mfa/verify?returnTo=%2Fdashboard%2Fadmin%2Fusers%2Fnew" target="_blank" rel="noopener noreferrer">Verify authenticator in another tab</Link></Button>}
      {state.success && <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link href="/dashboard/admin/users">View user directory</Link></Button><Button asChild variant="outline"><Link href="/dashboard/admin/access">Grant approved app access</Link></Button><Button type="button" variant="outline" onClick={() => window.location.reload()}>Add another staff member</Button></div>}
    </form>
  );
}
