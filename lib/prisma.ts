import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    throw new Error("DATABASE_URL is required.");
  }

  try {
    return new URL(value).toString();
  } catch {
    throw new Error(
      "DATABASE_URL is not a valid PostgreSQL URL. Percent-encode reserved password characters.",
    );
  }
}

const adapter = new PrismaPg({
  connectionString: getDatabaseUrl(),
});

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: 
      process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


// import { PrismaClient } from "@/lib/generated/prisma/client";

// const globalForPrisma = global as unknown as {
//   prisma: PrismaClient;
// };

// export const prisma =
//   globalForPrisma.prisma ||
//   new PrismaClient({
//     log:
//       process.env.NODE_ENV === "development"
//         ? ["query", "error", "warn"]
//         : ["error"],
//   });

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
