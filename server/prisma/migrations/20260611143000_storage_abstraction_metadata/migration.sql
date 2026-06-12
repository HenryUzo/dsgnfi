-- Additive storage metadata for public CMS assets and private AI prefill artifacts.
-- Existing url-based assets and prefill artifact storage keys remain valid.

ALTER TABLE "Asset"
  ADD COLUMN "storageProvider" TEXT,
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "bucket" TEXT,
  ADD COLUMN "publicUrl" TEXT,
  ADD COLUMN "visibility" TEXT,
  ADD COLUMN "checksum" TEXT;

ALTER TABLE "AiPrefillArtifact"
  ADD COLUMN "storageProvider" TEXT,
  ADD COLUMN "bucket" TEXT,
  ADD COLUMN "visibility" TEXT,
  ADD COLUMN "checksum" TEXT,
  ADD COLUMN "retainedUntil" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Asset_siteId_storageProvider_idx" ON "Asset"("siteId", "storageProvider");
CREATE INDEX "Asset_storageKey_idx" ON "Asset"("storageKey");
CREATE INDEX "AiPrefillArtifact_storageProvider_idx" ON "AiPrefillArtifact"("storageProvider");
CREATE INDEX "AiPrefillArtifact_deletedAt_idx" ON "AiPrefillArtifact"("deletedAt");
