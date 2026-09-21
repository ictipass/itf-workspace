-- D43: governed authenticator replacement and assisted recovery.
CREATE TYPE "MfaRecoveryAuthorityRole" AS ENUM ('HR_IDENTITY_VERIFIER', 'ICT_SECURITY_APPROVER', 'ICT_RECOVERY_OPERATOR');
CREATE TYPE "MfaRecoveryRequestStatus" AS ENUM ('PENDING_SECURITY_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'EXPIRED');

ALTER TYPE "AuditAction" ADD VALUE 'MFA_RECOVERY_CODES_REGENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_REPLACEMENT_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_REPLACED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_RECOVERY_AUTHORITY_GRANTED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_RECOVERY_AUTHORITY_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_RECOVERY_REQUEST_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_RECOVERY_REQUEST_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_RECOVERY_REQUEST_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_RECOVERY_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'SECURITY_NOTIFICATION_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'SECURITY_NOTIFICATION_FAILED';

ALTER TYPE "WorkspaceSessionRevocationReason" ADD VALUE 'MFA_REPLACED';
ALTER TYPE "WorkspaceSessionRevocationReason" ADD VALUE 'MFA_RECOVERY';

ALTER TABLE "User"
  ADD COLUMN "mfaEnrollmentRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfaRecoveryFailedAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "mfaRecoveryLockedUntil" TIMESTAMP(3);

CREATE TABLE "MfaRecoveryCode" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MfaRecoveryAuthority" (
  "id" TEXT NOT NULL,
  "role" "MfaRecoveryAuthorityRole" NOT NULL,
  "userId" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL,
  "approvalReference" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "MfaRecoveryAuthority_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MfaRecoveryRequest" (
  "id" TEXT NOT NULL,
  "status" "MfaRecoveryRequestStatus" NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "identityVerifiedById" TEXT NOT NULL,
  "identityVerificationReference" TEXT NOT NULL,
  "identityVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "securityApprovedById" TEXT,
  "securityApprovalReference" TEXT,
  "securityApprovedAt" TIMESTAMP(3),
  "executedById" TEXT,
  "executedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MfaRecoveryRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MfaRecoveryCode_codeHash_key" ON "MfaRecoveryCode"("codeHash");
CREATE INDEX "MfaRecoveryCode_userId_consumedAt_idx" ON "MfaRecoveryCode"("userId", "consumedAt");
CREATE UNIQUE INDEX "MfaRecoveryAuthority_userId_key" ON "MfaRecoveryAuthority"("userId");
CREATE INDEX "MfaRecoveryAuthority_role_revokedAt_idx" ON "MfaRecoveryAuthority"("role", "revokedAt");
CREATE INDEX "MfaRecoveryRequest_targetUserId_status_idx" ON "MfaRecoveryRequest"("targetUserId", "status");
CREATE INDEX "MfaRecoveryRequest_status_expiresAt_idx" ON "MfaRecoveryRequest"("status", "expiresAt");

ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MfaRecoveryAuthority" ADD CONSTRAINT "MfaRecoveryAuthority_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MfaRecoveryAuthority" ADD CONSTRAINT "MfaRecoveryAuthority_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MfaRecoveryRequest" ADD CONSTRAINT "MfaRecoveryRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MfaRecoveryRequest" ADD CONSTRAINT "MfaRecoveryRequest_identityVerifiedById_fkey" FOREIGN KEY ("identityVerifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MfaRecoveryRequest" ADD CONSTRAINT "MfaRecoveryRequest_securityApprovedById_fkey" FOREIGN KEY ("securityApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MfaRecoveryRequest" ADD CONSTRAINT "MfaRecoveryRequest_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
