"use client";

import { useActionState } from "react";
import {
  approveRecoveryRequestAction,
  createRecoveryRequestAction,
  executeRecoveryRequestAction,
  grantAuthorityAction,
  rejectRecoveryRequestAction,
  type RecoveryOperationState,
} from "./actions";

const initial: RecoveryOperationState = {};

function Result({ state }: { state: RecoveryOperationState }) {
  if (state.error) return <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>;
  if (state.success) return <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{state.success}</p>;
  return null;
}

export function AuthorityForm({ users }: { users: { id: string; fullName: string; email: string }[] }) {
  const [state, action, pending] = useActionState(grantAuthorityAction, initial);
  return <form action={action} className="grid gap-3 md:grid-cols-3"><Result state={state} /><select name="userId" required className="rounded-md border bg-background px-3 py-2 text-sm"><option value="">Select authority holder</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName} — {user.email}</option>)}</select><select name="role" required className="rounded-md border bg-background px-3 py-2 text-sm"><option value="HR_IDENTITY_VERIFIER">HR identity verifier</option><option value="ICT_SECURITY_APPROVER">ICT Security approver</option><option value="ICT_RECOVERY_OPERATOR">ICT Recovery Operator</option></select><input name="approvalReference" required minLength={5} maxLength={200} placeholder="Appointment/approval reference" className="rounded-md border bg-background px-3 py-2 text-sm"/><button disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:col-span-3">Assign authority</button></form>;
}

export function IdentityVerificationForm({ users }: { users: { id: string; fullName: string; email: string }[] }) {
  const [state, action, pending] = useActionState(createRecoveryRequestAction, initial);
  return <form action={action} className="space-y-3"><Result state={state} /><select name="targetUserId" required className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Select verified staff member</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName} — {user.email}</option>)}</select><input name="identityVerificationReference" required minLength={5} maxLength={200} placeholder="In-person HR verification reference" className="w-full rounded-md border bg-background px-3 py-2 text-sm"/><label className="flex gap-2 text-sm"><input type="checkbox" required /> I verified this person in person against the authoritative HR record.</label><button disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Create recovery request</button></form>;
}

export function ApprovalForm({ requestId }: { requestId: string }) {
  const [approveState, approve, approving] = useActionState(approveRecoveryRequestAction, initial);
  const [rejectState, reject, rejecting] = useActionState(rejectRecoveryRequestAction, initial);
  return <div className="space-y-2"><form action={approve} className="flex gap-2"><input type="hidden" name="requestId" value={requestId}/><input name="approvalReference" required minLength={5} placeholder="Security approval reference" className="min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"/><button disabled={approving} className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground">Approve</button></form><Result state={approveState}/><form action={reject} className="flex gap-2"><input type="hidden" name="requestId" value={requestId}/><input name="reason" required minLength={5} placeholder="Rejection reason" className="min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"/><button disabled={rejecting} className="rounded-md border px-3 py-1 text-sm">Reject</button></form><Result state={rejectState}/></div>;
}

export function ExecutionForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(executeRecoveryRequestAction, initial);
  return <form action={action} className="space-y-2"><input type="hidden" name="requestId" value={requestId}/><Result state={state}/><label className="flex gap-2 text-sm"><input type="checkbox" required/> Terminate all sessions and invalidate the old factor and codes.</label><button disabled={pending} className="rounded-md bg-destructive px-3 py-1 text-sm text-destructive-foreground">Execute recovery</button></form>;
}
