-- Prisma's @updatedAt attribute manages this value during writes. The W03
-- table-creation migration used a database default only to support its initial
-- backfill, so remove that default once the table exists.
ALTER TABLE "AppRolePolicy" ALTER COLUMN "updatedAt" DROP DEFAULT;
