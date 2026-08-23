-- CreateEnum
CREATE TYPE "WorkspaceSessionRevocationReason" AS ENUM ('USER_SIGN_OUT', 'USER_TERMINATED', 'ADMIN_TERMINATED', 'PASSWORD_CHANGED', 'ACCOUNT_DEACTIVATED', 'IDLE_TIMEOUT', 'ABSOLUTE_TIMEOUT', 'SESSION_LIMIT_RECOVERY');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SESSION_TERMINATED';

-- CreateTable
CREATE TABLE "WorkspaceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authenticatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idleExpiresAt" TIMESTAMP(3) NOT NULL,
    "absoluteExpiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" "WorkspaceSessionRevocationReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSessionRecoveryGrant" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceSessionRecoveryGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceSession_userId_revokedAt_idx" ON "WorkspaceSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "WorkspaceSession_idleExpiresAt_idx" ON "WorkspaceSession"("idleExpiresAt");

-- CreateIndex
CREATE INDEX "WorkspaceSession_absoluteExpiresAt_idx" ON "WorkspaceSession"("absoluteExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSessionRecoveryGrant_tokenHash_key" ON "WorkspaceSessionRecoveryGrant"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkspaceSessionRecoveryGrant_userId_expiresAt_idx" ON "WorkspaceSessionRecoveryGrant"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "WorkspaceSession" ADD CONSTRAINT "WorkspaceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSessionRecoveryGrant" ADD CONSTRAINT "WorkspaceSessionRecoveryGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
