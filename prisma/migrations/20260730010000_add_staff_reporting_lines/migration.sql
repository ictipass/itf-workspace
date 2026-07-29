ALTER TABLE "User" ADD COLUMN "supervisorId" TEXT;

CREATE INDEX "User_supervisorId_status_idx" ON "User"("supervisorId", "status");

ALTER TABLE "User"
ADD CONSTRAINT "User_supervisorId_fkey"
FOREIGN KEY ("supervisorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
