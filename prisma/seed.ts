import bcrypt from "bcryptjs";
import {
  AppCategory,
  AppEnvironment,
  AppStatus,
  UserStatus,
  WorkspaceRole,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL ?? "admin@itf.gov.ng";
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "Password123!";
  const fullName = process.env.INITIAL_ADMIN_NAME ?? "System Administrator";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      workspaceRole: WorkspaceRole.SYSTEM_ADMIN,
      status: UserStatus.ACTIVE,
      isTemporaryPassword: true,
      passwordHash,
    },
    create: {
      staffNumber: "ITF-SYS-001",
      fullName,
      email,
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
      url: process.env.ITF_FLOW_URL ?? "http://localhost:3001/workspace/launch",
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
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
