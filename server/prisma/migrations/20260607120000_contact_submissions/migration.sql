-- CreateEnum
CREATE TYPE "ContactSubmissionStatus" AS ENUM ('NEW', 'REVIEWED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ContactSubmission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "siteId" UUID NOT NULL,
  "status" "ContactSubmissionStatus" NOT NULL DEFAULT 'NEW',
  "firstName" TEXT,
  "lastName" TEXT,
  "email" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "jobTitle" TEXT,
  "message" TEXT NOT NULL,
  "pagePath" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactSubmission_siteId_status_createdAt_idx" ON "ContactSubmission"("siteId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_siteId_createdAt_idx" ON "ContactSubmission"("siteId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
