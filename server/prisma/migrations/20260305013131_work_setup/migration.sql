-- AlterTable
ALTER TABLE "CmsSection" ALTER COLUMN "draftData" SET DEFAULT '{}'::jsonb,
ALTER COLUMN "publishedData" SET DEFAULT '{}'::jsonb;

-- CreateTable
CREATE TABLE "WorkPageMeta" (
    "key" TEXT NOT NULL DEFAULT 'work',
    "titleDraft" TEXT NOT NULL DEFAULT 'Our Work',
    "subtitleDraft" TEXT NOT NULL DEFAULT '',
    "titlePublished" TEXT NOT NULL DEFAULT 'Our Work',
    "subtitlePublished" TEXT NOT NULL DEFAULT '',
    "status" "CmsStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkPageMeta_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "WorkTag" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkProject" (
    "id" UUID NOT NULL,
    "templateId" TEXT NOT NULL,
    "titleDraft" TEXT NOT NULL,
    "slugDraft" TEXT NOT NULL,
    "excerptDraft" TEXT NOT NULL,
    "coverImageDraft" TEXT NOT NULL,
    "draftContent" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "titlePublished" TEXT,
    "slugPublished" TEXT,
    "excerptPublished" TEXT,
    "coverImagePublished" TEXT,
    "publishedContent" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "status" "CmsStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkProjectTag" (
    "projectId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "WorkProjectTag_pkey" PRIMARY KEY ("projectId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkTag_slug_key" ON "WorkTag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WorkProject_slugDraft_key" ON "WorkProject"("slugDraft");

-- CreateIndex
CREATE UNIQUE INDEX "WorkProject_slugPublished_key" ON "WorkProject"("slugPublished");

-- CreateIndex
CREATE INDEX "WorkProject_status_idx" ON "WorkProject"("status");

-- CreateIndex
CREATE INDEX "WorkProjectTag_tagId_idx" ON "WorkProjectTag"("tagId");

-- AddForeignKey
ALTER TABLE "WorkProjectTag" ADD CONSTRAINT "WorkProjectTag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorkProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkProjectTag" ADD CONSTRAINT "WorkProjectTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "WorkTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
