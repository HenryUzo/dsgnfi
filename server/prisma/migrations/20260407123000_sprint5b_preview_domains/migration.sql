-- AlterTable
ALTER TABLE "SiteDomain"
ADD COLUMN "verificationHost" TEXT,
ADD COLUMN "verificationValue" TEXT,
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "lastVerificationAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastVerificationError" TEXT;

-- CreateTable
CREATE TABLE "PreviewToken" (
    "id" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "pageKey" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviewToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreviewToken_tokenHash_key" ON "PreviewToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PreviewToken_siteId_expiresAt_idx" ON "PreviewToken"("siteId", "expiresAt");

-- CreateIndex
CREATE INDEX "PreviewToken_siteId_pageKey_idx" ON "PreviewToken"("siteId", "pageKey");

-- AddForeignKey
ALTER TABLE "PreviewToken" ADD CONSTRAINT "PreviewToken_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviewToken" ADD CONSTRAINT "PreviewToken_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
