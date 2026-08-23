-- CreateEnum
CREATE TYPE "AssuranceRequirement" AS ENUM ('STANDARD', 'SENSITIVE');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'MFA_ENROLLED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_VERIFIED';
ALTER TYPE "AuditAction" ADD VALUE 'APP_ROLE_POLICY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'APP_ROLE_POLICY_UPDATED';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "totpSecretCiphertext" TEXT,
ADD COLUMN "totpEnrolledAt" TIMESTAMP(3),
ADD COLUMN "totpPendingSecretCiphertext" TEXT,
ADD COLUMN "totpPendingExpiresAt" TIMESTAMP(3),
ADD COLUMN "totpLastUsedCounter" BIGINT;

-- AlterTable
ALTER TABLE "WorkspaceSession"
ADD COLUMN "mfaAuthenticatedAt" TIMESTAMP(3),
ADD COLUMN "authenticationMethods" TEXT[] NOT NULL DEFAULT ARRAY['pwd']::TEXT[];

-- AlterTable
ALTER TABLE "App"
ADD COLUMN "assuranceRequirement" "AssuranceRequirement" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "launchAudience" TEXT;

UPDATE "App" SET "launchAudience" = "slug" WHERE "launchAudience" IS NULL;
ALTER TABLE "App" ALTER COLUMN "launchAudience" SET NOT NULL;

-- Existing unclassified access is preserved as an explicit standard USER role.
UPDATE "AppAccess" SET "appRole" = 'USER' WHERE "appRole" IS NULL OR BTRIM("appRole") = '';
ALTER TABLE "AppAccess" ALTER COLUMN "appRole" SET NOT NULL;

-- CreateTable
CREATE TABLE "AppRolePolicy" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "assuranceRequirement" "AssuranceRequirement" NOT NULL DEFAULT 'STANDARD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppRolePolicy_pkey" PRIMARY KEY ("id")
);

-- Backfill every role already assigned by the authoritative access registry.
INSERT INTO "AppRolePolicy" ("id", "appId", "roleCode", "assuranceRequirement")
SELECT 'role_' || MD5("appId" || ':' || UPPER(BTRIM("appRole"))),
       "appId",
       UPPER(BTRIM("appRole")),
       'STANDARD'::"AssuranceRequirement"
FROM "AppAccess"
GROUP BY "appId", UPPER(BTRIM("appRole"));

UPDATE "AppAccess" SET "appRole" = UPPER(BTRIM("appRole"));

-- CreateIndex
CREATE UNIQUE INDEX "App_launchAudience_key" ON "App"("launchAudience");
CREATE UNIQUE INDEX "AppRolePolicy_appId_roleCode_key" ON "AppRolePolicy"("appId", "roleCode");
CREATE INDEX "AppRolePolicy_appId_isActive_idx" ON "AppRolePolicy"("appId", "isActive");

-- AddForeignKey
ALTER TABLE "AppRolePolicy" ADD CONSTRAINT "AppRolePolicy_appId_fkey"
FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
