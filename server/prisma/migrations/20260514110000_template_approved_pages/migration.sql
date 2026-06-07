-- AlterTable
ALTER TABLE "Page"
ADD COLUMN "pageTemplateKey" TEXT,
ADD COLUMN "allowedBlockTypes" JSONB;
