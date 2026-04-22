-- AlterTable
ALTER TABLE "CmsSection" ALTER COLUMN "draftData" SET DEFAULT '{}'::jsonb,
ALTER COLUMN "publishedData" SET DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "WorkProject" ALTER COLUMN "draftContent" SET DEFAULT '{}'::jsonb,
ALTER COLUMN "publishedContent" SET DEFAULT '{}'::jsonb;
