import { redirect } from "next/navigation";
import { MfaRecoveryAuthorityRole, MfaRecoveryRequestStatus, UserStatus, WorkspaceRole } from "@/lib/generated/prisma/client";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthorityForm, ApprovalForm, ExecutionForm, IdentityVerificationForm } from "./recovery-forms";
import { revokeAuthorityAction } from "./actions";
import Link from "next/link";

export default async function MfaRecoveryOperationsPage() {
  const context = await getCurrentSessionContext();
  if (!context) redirect("/login");
  const [authority, authorities, users, requests] = await Promise.all([
    prisma.mfaRecoveryAuthority.findFirst({ where: { userId: context.user.id, revokedAt: null } }),
    prisma.mfaRecoveryAuthority.findMany({ where: { revokedAt: null }, include: { user: true, grantedBy: true }, orderBy: { role: "asc" } }),
    prisma.user.findMany({ where: { status: UserStatus.ACTIVE }, select: { id: true, fullName: true, email: true }, orderBy: { fullName: "asc" } }),
    prisma.mfaRecoveryRequest.findMany({ where: { status: { in: [MfaRecoveryRequestStatus.PENDING_SECURITY_APPROVAL, MfaRecoveryRequestStatus.APPROVED] }, expiresAt: { gt: new Date() } }, include: { targetUser: true, identityVerifiedBy: true, securityApprovedBy: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const systemAdmin = context.user.workspaceRole === WorkspaceRole.SYSTEM_ADMIN;
  if (!systemAdmin && !authority) redirect("/dashboard");
  const canVerify = authority?.role === MfaRecoveryAuthorityRole.HR_IDENTITY_VERIFIER;
  const canApprove = authority?.role === MfaRecoveryAuthorityRole.ICT_SECURITY_APPROVER;
  const canExecute = systemAdmin || authority?.role === MfaRecoveryAuthorityRole.ICT_RECOVERY_OPERATOR;
  return <div className="mx-auto max-w-6xl space-y-6"><div><h1 className="text-3xl font-bold tracking-tight">MFA recovery operations</h1><p className="mt-2 text-muted-foreground">D43 separation-of-duties workflow. Every mutation requires fresh TOTP; references must point to approved internal records and must not contain secrets.</p><Link className="mt-2 inline-block text-sm font-medium text-primary underline" href="/mfa/verify?returnTo=%2Fdashboard%2Fadmin%2Fmfa-recovery">Verify authenticator for recovery work</Link></div>
    {systemAdmin ? <Card><CardHeader><CardTitle>Recovery authority assignments</CardTitle></CardHeader><CardContent className="space-y-5"><AuthorityForm users={users.filter((u) => u.id !== context.user.id)}/><div className="space-y-2">{authorities.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span><strong>{item.user.fullName}</strong> — {item.role.replaceAll("_", " ")}<br/><span className="text-muted-foreground">Ref: {item.approvalReference}; appointed by {item.grantedBy.fullName}</span></span><form action={revokeAuthorityAction} className="flex items-center gap-2"><input type="hidden" name="authorityId" value={item.id}/><label className="flex items-center gap-1 text-xs"><input type="checkbox" required/> Confirm</label><button className="rounded-md border px-3 py-1">Revoke</button></form></div>)}</div></CardContent></Card> : null}
    {canVerify ? <Card><CardHeader><CardTitle>Record in-person HR identity verification</CardTitle></CardHeader><CardContent><IdentityVerificationForm users={users.filter((u) => u.id !== context.user.id)}/></CardContent></Card> : null}
    <Card><CardHeader><CardTitle>Open recovery requests</CardTitle></CardHeader><CardContent className="space-y-4">{requests.length === 0 ? <p className="text-sm text-muted-foreground">No active recovery requests.</p> : requests.map((request) => <div key={request.id} className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[1fr_1fr]"><div className="text-sm"><p className="font-semibold">{request.targetUser.fullName}</p><p>{request.targetUser.email} · {request.targetUser.workspaceRole}</p><p className="mt-2 text-muted-foreground">HR verifier: {request.identityVerifiedBy.fullName}<br/>Reference: {request.identityVerificationReference}<br/>Status: {request.status.replaceAll("_", " ")}<br/>Expires: {request.expiresAt.toLocaleString("en-NG")}</p>{request.securityApprovedBy ? <p className="mt-2 text-muted-foreground">Security approver: {request.securityApprovedBy.fullName}<br/>Reference: {request.securityApprovalReference}</p> : null}</div><div>{canApprove && request.status === MfaRecoveryRequestStatus.PENDING_SECURITY_APPROVAL ? <ApprovalForm requestId={request.id}/> : null}{canExecute && request.status === MfaRecoveryRequestStatus.APPROVED ? <ExecutionForm requestId={request.id}/> : null}</div></div>)}</CardContent></Card>
  </div>;
}
