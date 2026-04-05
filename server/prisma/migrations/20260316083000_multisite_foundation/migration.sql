-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "SiteDomainType" AS ENUM ('SUBDOMAIN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DomainVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- Helper UUID function that does not depend on extensions.
CREATE OR REPLACE FUNCTION dsgnfi_random_uuid() RETURNS UUID AS $$
DECLARE
  v_hash TEXT;
BEGIN
  v_hash := md5(random()::text || clock_timestamp()::text || random()::text);
  RETURN (
    substr(v_hash, 1, 8) || '-' ||
    substr(v_hash, 9, 4) || '-' ||
    substr(v_hash, 13, 4) || '-' ||
    substr(v_hash, 17, 4) || '-' ||
    substr(v_hash, 21, 12)
  )::uuid;
END;
$$ LANGUAGE plpgsql;

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL DEFAULT dsgnfi_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" UUID NOT NULL DEFAULT dsgnfi_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "SiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL DEFAULT dsgnfi_random_uuid(),
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteDomain" (
    "id" UUID NOT NULL DEFAULT dsgnfi_random_uuid(),
    "siteId" UUID NOT NULL,
    "hostname" TEXT NOT NULL,
    "type" "SiteDomainType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "DomainVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteDomain_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CmsSection" ADD COLUMN "siteId" UUID;

-- AlterTable
ALTER TABLE "WorkPageMeta" ADD COLUMN "siteId" UUID;

-- AlterTable
ALTER TABLE "WorkProject" ADD COLUMN "siteId" UUID;

-- AlterTable
ALTER TABLE "WorkTag" ADD COLUMN "siteId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Site_tenantId_slug_key" ON "Site"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Site_tenantId_idx" ON "Site"("tenantId");

-- CreateIndex
CREATE INDEX "Site_tenantId_isDefault_idx" ON "Site"("tenantId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Site_tenantId_default_true_key" ON "Site"("tenantId") WHERE "isDefault" = true;

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteDomain_hostname_key" ON "SiteDomain"("hostname");

-- CreateIndex
CREATE INDEX "SiteDomain_siteId_idx" ON "SiteDomain"("siteId");

DO $$
DECLARE
  v_tenant_id UUID;
  v_site_id UUID;
BEGIN
  SELECT "id" INTO v_tenant_id FROM "Tenant" WHERE "slug" = 'dsgnfi' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    INSERT INTO "Tenant" ("name", "slug", "updatedAt")
    VALUES ('Dsgnfi', 'dsgnfi', NOW())
    RETURNING "id" INTO v_tenant_id;
  ELSE
    UPDATE "Tenant"
    SET "name" = 'Dsgnfi', "updatedAt" = NOW()
    WHERE "id" = v_tenant_id;
  END IF;

  SELECT "id" INTO v_site_id
  FROM "Site"
  WHERE "tenantId" = v_tenant_id
    AND "slug" = 'main'
  LIMIT 1;

  IF v_site_id IS NULL THEN
    INSERT INTO "Site" ("tenantId", "name", "slug", "status", "isDefault", "updatedAt")
    VALUES (v_tenant_id, 'Main Site', 'main', 'ACTIVE', true, NOW())
    RETURNING "id" INTO v_site_id;
  ELSE
    UPDATE "Site"
    SET "name" = 'Main Site', "status" = 'ACTIVE', "isDefault" = true, "updatedAt" = NOW()
    WHERE "id" = v_site_id;
  END IF;

  UPDATE "Site"
  SET "isDefault" = false, "updatedAt" = NOW()
  WHERE "tenantId" = v_tenant_id
    AND "id" <> v_site_id
    AND "isDefault" = true;

  INSERT INTO "Membership" ("userId", "tenantId", "role", "updatedAt")
  SELECT u."id", v_tenant_id, 'OWNER', NOW()
  FROM "AdminUser" u
  WHERE NOT EXISTS (
    SELECT 1
    FROM "Membership" m
    WHERE m."userId" = u."id"
      AND m."tenantId" = v_tenant_id
  );

  UPDATE "CmsSection" SET "siteId" = v_site_id WHERE "siteId" IS NULL;
  UPDATE "WorkPageMeta" SET "siteId" = v_site_id WHERE "siteId" IS NULL;
  UPDATE "WorkTag" SET "siteId" = v_site_id WHERE "siteId" IS NULL;
  UPDATE "WorkProject" SET "siteId" = v_site_id WHERE "siteId" IS NULL;
END $$;

-- AlterTable
ALTER TABLE "CmsSection" ALTER COLUMN "siteId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WorkPageMeta" ALTER COLUMN "siteId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WorkTag" ALTER COLUMN "siteId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WorkProject" ALTER COLUMN "siteId" SET NOT NULL;

-- DropIndex
DROP INDEX "CmsSection_page_section_key";

-- DropIndex
DROP INDEX "CmsSection_page_idx";

-- DropIndex
DROP INDEX "WorkTag_slug_key";

-- DropIndex
DROP INDEX "WorkProject_slugDraft_key";

-- DropIndex
DROP INDEX "WorkProject_slugPublished_key";

-- DropIndex
DROP INDEX "WorkProject_status_idx";

-- AlterTable
ALTER TABLE "WorkPageMeta" DROP CONSTRAINT "WorkPageMeta_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "CmsSection_siteId_page_section_key" ON "CmsSection"("siteId", "page", "section");

-- CreateIndex
CREATE INDEX "CmsSection_siteId_page_idx" ON "CmsSection"("siteId", "page");

-- CreateIndex
CREATE UNIQUE INDEX "WorkTag_siteId_slug_key" ON "WorkTag"("siteId", "slug");

-- CreateIndex
CREATE INDEX "WorkTag_siteId_idx" ON "WorkTag"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkProject_siteId_slugDraft_key" ON "WorkProject"("siteId", "slugDraft");

-- CreateIndex
CREATE UNIQUE INDEX "WorkProject_siteId_slugPublished_key" ON "WorkProject"("siteId", "slugPublished");

-- CreateIndex
CREATE INDEX "WorkProject_siteId_status_idx" ON "WorkProject"("siteId", "status");

-- CreateIndex
CREATE INDEX "WorkPageMeta_siteId_idx" ON "WorkPageMeta"("siteId");

-- Add primary key
ALTER TABLE "WorkPageMeta" ADD CONSTRAINT "WorkPageMeta_pkey" PRIMARY KEY ("siteId", "key");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteDomain" ADD CONSTRAINT "SiteDomain_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsSection" ADD CONSTRAINT "CmsSection_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPageMeta" ADD CONSTRAINT "WorkPageMeta_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTag" ADD CONSTRAINT "WorkTag_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkProject" ADD CONSTRAINT "WorkProject_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep helper function in place because Tenant/Site/Membership/SiteDomain
-- id defaults depend on it after this migration completes.
