/*
  Warnings:

  - Changed the type of `type` on the `Office` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OfficeType" AS ENUM ('HEADQUARTERS', 'ZONAL_OFFICE', 'CORPORATE_OFFICE', 'SKILLS_CENTRE', 'AREA_OFFICE', 'STAFF_SCHOOL');

-- AlterTable
ALTER TABLE "Office" DROP COLUMN "type",
ADD COLUMN     "type" "OfficeType" NOT NULL;
