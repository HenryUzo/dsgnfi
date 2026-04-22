-- DropIndex
DROP INDEX IF EXISTS "Page_currentDraftRevisionId_key";

-- DropIndex
DROP INDEX IF EXISTS "Page_currentPublishedRevisionId_key";

-- AlterTable
ALTER TABLE "CmsSection" ALTER COLUMN "draftData" SET DEFAULT '{}'::jsonb,
ALTER COLUMN "publishedData" SET DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "WorkProject" ALTER COLUMN "draftContent" SET DEFAULT '{}'::jsonb,
ALTER COLUMN "publishedContent" SET DEFAULT '{}'::jsonb;
