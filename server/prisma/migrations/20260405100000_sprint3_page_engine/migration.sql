-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PageRevisionState" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Page" (
    "id" UUID NOT NULL DEFAULT dsgnfi_random_uuid(),
    "siteId" UUID NOT NULL,
    "pageKey" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "currentDraftRevisionId" UUID,
    "currentPublishedRevisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageRevision" (
    "id" UUID NOT NULL DEFAULT dsgnfi_random_uuid(),
    "pageId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "state" "PageRevisionState" NOT NULL,
    "content" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "checksum" TEXT,
    "createdBy" UUID,
    "publishedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "PageRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_siteId_pageKey_key" ON "Page"("siteId", "pageKey");

-- CreateIndex
CREATE UNIQUE INDEX "Page_siteId_slug_key" ON "Page"("siteId", "slug");

-- CreateIndex
CREATE INDEX "Page_siteId_status_idx" ON "Page"("siteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Page_currentDraftRevisionId_key" ON "Page"("currentDraftRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_currentPublishedRevisionId_key" ON "Page"("currentPublishedRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "PageRevision_pageId_revisionNumber_key" ON "PageRevision"("pageId", "revisionNumber");

-- CreateIndex
CREATE INDEX "PageRevision_pageId_revisionNumber_idx" ON "PageRevision"("pageId", "revisionNumber");

-- CreateIndex
CREATE INDEX "PageRevision_pageId_state_createdAt_idx" ON "PageRevision"("pageId", "state", "createdAt");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_currentDraftRevisionId_fkey" FOREIGN KEY ("currentDraftRevisionId") REFERENCES "PageRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_currentPublishedRevisionId_fkey" FOREIGN KEY ("currentPublishedRevisionId") REFERENCES "PageRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageRevision" ADD CONSTRAINT "PageRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageRevision" ADD CONSTRAINT "PageRevision_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageRevision" ADD CONSTRAINT "PageRevision_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
