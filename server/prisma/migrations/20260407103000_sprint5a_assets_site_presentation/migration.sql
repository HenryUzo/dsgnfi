-- Alter SiteSettings for structured navigation
ALTER TABLE "SiteSettings"
ADD COLUMN "primaryNavigation" JSONB,
ADD COLUMN "footerNavigation" JSONB;

-- Create site-scoped asset library
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Asset_siteId_createdAt_idx" ON "Asset"("siteId", "createdAt");

ALTER TABLE "Asset"
ADD CONSTRAINT "Asset_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
