import bcrypt from "bcryptjs";
import { PrismaClient, UserStatus, WorkspaceRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma"

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL ?? "admin@itf.gov.ng";
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "Password123!";
  const fullName = process.env.INITIAL_ADMIN_NAME ?? "System Administrator";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
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

  console.log("✅ SYSTEM_ADMIN seeded successfully");
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