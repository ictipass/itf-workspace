import "dotenv/config";

import bcrypt from "bcryptjs";
import {
  AppCategory,
  AppEnvironment,
  AppStatus,
  UserStatus,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceSeedConfiguration } from "@/lib/config/workspace-environment";

async function main() {
  const configuration = resolveWorkspaceSeedConfiguration();
  const passwordHash = await bcrypt.hash(configuration.password, 10);

  const admin = await prisma.user.upsert({
    where: { email: configuration.email },
    update: {
      fullName: configuration.fullName,
      workspaceRole: WorkspaceRole.SYSTEM_ADMIN,
      status: UserStatus.ACTIVE,
      isTemporaryPassword: true,
      passwordHash,
    },
    create: {
      staffNumber: configuration.staffNumber,
      fullName: configuration.fullName,
      email: configuration.email,
      passwordHash,
      workspaceRole: WorkspaceRole.SYSTEM_ADMIN,
      status: UserStatus.ACTIVE,
      isTemporaryPassword: true,
    },
  });

  const flow = await prisma.app.upsert({
    where: { slug: "itf-flow" },
    update: {},
    create: {
      name: "ITF Flow",
      slug: "itf-flow",
      description: "Correspondence intake, hierarchical routing, minutes and accountable action.",
      url: configuration.itfFlowUrl,
      category: AppCategory.WORKFLOW,
      environment: AppEnvironment.DEVELOPMENT,
      status: AppStatus.ACTIVE,
    },
  });

  await prisma.appAccess.upsert({
    where: { userId_appId: { userId: admin.id, appId: flow.id } },
    update: { status: "ACTIVE", appRole: "SYSTEM_ADMIN", revokedAt: null },
    create: {
      userId: admin.id,
      appId: flow.id,
      appRole: "SYSTEM_ADMIN",
      status: "ACTIVE",
      grantedById: admin.id,
    },
  });

  console.log("✅ SYSTEM_ADMIN and ITF Flow registry entry seeded successfully.");
  console.log(`Email: ${configuration.email}`);
  if (configuration.mode !== "production") {
    console.log(`Development password: ${configuration.password}`);
  }
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
