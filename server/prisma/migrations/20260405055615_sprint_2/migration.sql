-- DropIndex
DROP INDEX "Site_tenantId_default_true_key";

-- AlterTable
ALTER TABLE "CmsSection" ALTER COLUMN "draftData" SET DEFAULT '{}'::jsonb,
ALTER COLUMN "publishedData" SET DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "Membership" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Site" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SiteDomain" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SiteSettings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Template" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TemplateVersion" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WorkProject" ALTER COLUMN "draftContent" SET DEFAULT '{}'::jsonb,
ALTER COLUMN "publishedContent" SET DEFAULT '{}'::jsonb;
