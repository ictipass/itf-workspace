-- CreateEnum
CREATE TYPE "IntegrationOutboxEventType" AS ENUM ('CENTRAL_LOGOUT', 'ENTITLEMENT_REVOKED');

-- CreateEnum
CREATE TYPE "IntegrationOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY', 'DELIVERED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "IntegrationOutboxEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "targetAppSlug" TEXT NOT NULL,
    "type" "IntegrationOutboxEventType" NOT NULL,
    "workspaceUserId" TEXT NOT NULL,
    "workspaceSessionId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "IntegrationOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseId" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationOutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationOutboxEvent_eventId_key" ON "IntegrationOutboxEvent"("eventId");

-- CreateIndex
CREATE INDEX "IntegrationOutboxEvent_targetAppSlug_status_availableAt_idx" ON "IntegrationOutboxEvent"("targetAppSlug", "status", "availableAt");

-- CreateIndex
CREATE INDEX "IntegrationOutboxEvent_status_leaseExpiresAt_idx" ON "IntegrationOutboxEvent"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "IntegrationOutboxEvent_workspaceUserId_createdAt_idx" ON "IntegrationOutboxEvent"("workspaceUserId", "createdAt");
