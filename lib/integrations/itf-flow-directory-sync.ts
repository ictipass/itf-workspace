import { randomUUID } from "node:crypto";
import {
  AppAccessStatus,
  AppStatus,
  IntegrationOutboxStatus,
  UserStatus,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveItfFlowDirectorySyncConfiguration } from "@/lib/config/workspace-environment";
import { buildItfFlowDirectoryBatch } from "@/lib/integrations/itf-flow-directory-contract";
import { deliverItfFlowSessionEvents } from "@/lib/integrations/itf-flow-session-events";

export async function syncItfFlowDirectory() {
  const configuration = resolveItfFlowDirectorySyncConfiguration();

  const accessRecords = await prisma.appAccess.findMany({
    where: {
      status: AppAccessStatus.ACTIVE,
      app: { slug: configuration.appSlug, status: AppStatus.ACTIVE },
    },
    include: {
      user: {
        include: {
          office: true,
          department: true,
          division: true,
          unit: true,
          position: true,
          supervisor: { select: { id: true } },
        },
      },
    },
    orderBy: { userId: "asc" },
  });

  const workspaceUserIds = accessRecords.map((access) => access.userId);
  if (workspaceUserIds.length) {
    const outstanding = await prisma.integrationOutboxEvent.findMany({
      where: {
        targetAppSlug: configuration.appSlug,
        workspaceUserId: { in: workspaceUserIds },
        status: { not: IntegrationOutboxStatus.DELIVERED },
      },
      select: { eventId: true },
    });
    if (outstanding.length) {
      await deliverItfFlowSessionEvents(outstanding.map((event) => event.eventId));
      const remaining = await prisma.integrationOutboxEvent.count({
        where: {
          eventId: { in: outstanding.map((event) => event.eventId) },
          status: { not: IntegrationOutboxStatus.DELIVERED },
        },
      });
      if (remaining) {
        throw new Error(
          "ITF Flow synchronization is blocked until pending revocation events are delivered."
        );
      }
    }
  }

  let createdCount = 0;
  let updatedCount = 0;
  let inactiveCount = 0;
  const runIds: string[] = [];

  const batchCount = Math.ceil(accessRecords.length / configuration.batchSize);
  for (let offset = 0; offset < accessRecords.length; offset += configuration.batchSize) {
    const batch = accessRecords.slice(offset, offset + configuration.batchSize);
    const batchIndex = Math.floor(offset / configuration.batchSize) + 1;
    const requestId = randomUUID();
    const response = await fetch(configuration.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildItfFlowDirectoryBatch({
        requestId,
        targetAppSlug: configuration.appSlug,
        batchIndex,
        batchCount,
        users: batch.map(({ user, appRole }) => ({
          workspaceUserId: user.id,
          staffNumber: user.staffNumber,
          email: user.email,
          name: user.fullName,
          role: appRole || "OFFICER",
          isActive: user.status === UserStatus.ACTIVE,
          office: user.office ? { id: user.office.id, name: user.office.name } : null,
          department: user.department
            ? { id: user.department.id, name: user.department.name }
            : null,
          division: user.division ? { id: user.division.id, name: user.division.name } : null,
          unit: user.unit ? { id: user.unit.id, name: user.unit.name } : null,
          position: user.position
            ? { id: user.position.id, name: user.position.title }
            : null,
          supervisorWorkspaceUserId: user.supervisor?.id ?? null,
        })),
      })),
      cache: "no-store",
      signal: AbortSignal.timeout(configuration.requestTimeoutMs),
    });
    const result = (await response.json()) as {
      error?: string;
      runId?: string;
      createdCount?: number;
      updatedCount?: number;
      inactiveCount?: number;
      version?: string;
      requestId?: string;
    };
    if (!response.ok || result.version !== "itf-workspace-directory-v1" || result.requestId !== requestId) {
      throw new Error(result.error ?? `ITF Flow synchronization failed (${response.status}).`);
    }
    if (result.runId) runIds.push(result.runId);
    createdCount += result.createdCount ?? 0;
    updatedCount += result.updatedCount ?? 0;
    inactiveCount += result.inactiveCount ?? 0;
  }

  return {
    totalCount: accessRecords.length,
    batchCount,
    createdCount,
    updatedCount,
    inactiveCount,
    runIds,
  };
}
