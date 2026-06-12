-- CreateEnum
CREATE TYPE "AiPrefillRunStatus" AS ENUM ('UPLOADED', 'GENERATED', 'APPLIED', 'REJECTED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "AiPrefillArtifactStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DELETED');

-- CreateEnum
CREATE TYPE "AiPrefillSuggestionStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED');

-- CreateTable
CREATE TABLE "AiPrefillRun" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "adminId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "pageId" UUID,
  "pageKey" TEXT NOT NULL,
  "status" "AiPrefillRunStatus" NOT NULL DEFAULT 'UPLOADED',
  "model" TEXT,
  "tokenEstimate" INTEGER,
  "analysis" JSONB,
  "pageSuggestion" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "generatedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),

  CONSTRAINT "AiPrefillRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPrefillArtifact" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "runId" UUID NOT NULL,
  "adminId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "pageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "extractedText" TEXT,
  "extractedSummary" TEXT,
  "status" "AiPrefillArtifactStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiPrefillArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPrefillSuggestion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "runId" UUID NOT NULL,
  "pageId" UUID,
  "blockId" TEXT,
  "blockType" TEXT,
  "label" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "dataPatch" JSONB NOT NULL,
  "pagePatch" JSONB,
  "confidence" DOUBLE PRECISION,
  "notes" TEXT,
  "status" "AiPrefillSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "appliedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),

  CONSTRAINT "AiPrefillSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSuggestionApplication" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "runId" UUID NOT NULL,
  "suggestionId" UUID,
  "adminId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "pageId" UUID,
  "pageKey" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "selectedMetadata" JSONB,
  "selectedSuggestionIds" JSONB,
  "appliedPatch" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiSuggestionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiPrefillRun_adminId_createdAt_idx" ON "AiPrefillRun"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AiPrefillRun_tenantId_siteId_pageKey_createdAt_idx" ON "AiPrefillRun"("tenantId", "siteId", "pageKey", "createdAt");

-- CreateIndex
CREATE INDEX "AiPrefillRun_siteId_status_createdAt_idx" ON "AiPrefillRun"("siteId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AiPrefillRun_expiresAt_idx" ON "AiPrefillRun"("expiresAt");

-- CreateIndex
CREATE INDEX "AiPrefillArtifact_runId_idx" ON "AiPrefillArtifact"("runId");

-- CreateIndex
CREATE INDEX "AiPrefillArtifact_tenantId_siteId_pageKey_createdAt_idx" ON "AiPrefillArtifact"("tenantId", "siteId", "pageKey", "createdAt");

-- CreateIndex
CREATE INDEX "AiPrefillArtifact_expiresAt_status_idx" ON "AiPrefillArtifact"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "AiPrefillSuggestion_runId_status_idx" ON "AiPrefillSuggestion"("runId", "status");

-- CreateIndex
CREATE INDEX "AiPrefillSuggestion_pageId_status_idx" ON "AiPrefillSuggestion"("pageId", "status");

-- CreateIndex
CREATE INDEX "AiSuggestionApplication_runId_createdAt_idx" ON "AiSuggestionApplication"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "AiSuggestionApplication_adminId_createdAt_idx" ON "AiSuggestionApplication"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AiSuggestionApplication_siteId_pageKey_createdAt_idx" ON "AiSuggestionApplication"("siteId", "pageKey", "createdAt");

-- AddForeignKey
ALTER TABLE "AiPrefillRun" ADD CONSTRAINT "AiPrefillRun_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrefillRun" ADD CONSTRAINT "AiPrefillRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrefillRun" ADD CONSTRAINT "AiPrefillRun_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrefillRun" ADD CONSTRAINT "AiPrefillRun_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrefillArtifact" ADD CONSTRAINT "AiPrefillArtifact_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiPrefillRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrefillArtifact" ADD CONSTRAINT "AiPrefillArtifact_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrefillArtifact" ADD CONSTRAINT "AiPrefillArtifact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrefillArtifact" ADD CONSTRAINT "AiPrefillArtifact_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrefillSuggestion" ADD CONSTRAINT "AiPrefillSuggestion_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiPrefillRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrefillSuggestion" ADD CONSTRAINT "AiPrefillSuggestion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSuggestionApplication" ADD CONSTRAINT "AiSuggestionApplication_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiPrefillRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSuggestionApplication" ADD CONSTRAINT "AiSuggestionApplication_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "AiPrefillSuggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSuggestionApplication" ADD CONSTRAINT "AiSuggestionApplication_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSuggestionApplication" ADD CONSTRAINT "AiSuggestionApplication_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSuggestionApplication" ADD CONSTRAINT "AiSuggestionApplication_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
