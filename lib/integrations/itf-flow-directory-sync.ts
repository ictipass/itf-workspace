import { AppAccessStatus, UserStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveItfFlowDirectorySyncConfiguration } from "@/lib/config/workspace-environment";

const BATCH_SIZE = 200;

export async function syncItfFlowDirectory() {
  const configuration = resolveItfFlowDirectorySyncConfiguration();

  const accessRecords = await prisma.appAccess.findMany({
    where: {
      status: AppAccessStatus.ACTIVE,
      app: { slug: "itf-flow" },
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

  let createdCount = 0;
  let updatedCount = 0;
  let inactiveCount = 0;
  const runIds: string[] = [];

  for (let offset = 0; offset < accessRecords.length; offset += BATCH_SIZE) {
    const batch = accessRecords.slice(offset, offset + BATCH_SIZE);
    const response = await fetch(configuration.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "itf-workspace",
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
      }),
      cache: "no-store",
    });
    const result = (await response.json()) as {
      error?: string;
      runId?: string;
      createdCount?: number;
      updatedCount?: number;
      inactiveCount?: number;
    };
    if (!response.ok) {
      throw new Error(result.error ?? `ITF Flow synchronization failed (${response.status}).`);
    }
    if (result.runId) runIds.push(result.runId);
    createdCount += result.createdCount ?? 0;
    updatedCount += result.updatedCount ?? 0;
    inactiveCount += result.inactiveCount ?? 0;
  }

  return {
    totalCount: accessRecords.length,
    batchCount: Math.ceil(accessRecords.length / BATCH_SIZE),
    createdCount,
    updatedCount,
    inactiveCount,
    runIds,
  };
}
