DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TemplateSourceType') THEN
    CREATE TYPE "TemplateSourceType" AS ENUM ('STARTER', 'CUSTOM');
  END IF;
END $$;

ALTER TABLE "Template"
  ADD COLUMN IF NOT EXISTS "tenantId" UUID,
  ADD COLUMN IF NOT EXISTS "sourceType" "TemplateSourceType" NOT NULL DEFAULT 'STARTER',
  ADD COLUMN IF NOT EXISTS "baseTemplateKey" TEXT,
  ADD COLUMN IF NOT EXISTS "createdBy" UUID,
  ADD COLUMN IF NOT EXISTS "draftName" TEXT,
  ADD COLUMN IF NOT EXISTS "draftCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "draftDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "draftPresetOverrides" JSONB;

ALTER TABLE "TemplateVersion"
  ADD COLUMN IF NOT EXISTS "presetOverrides" JSONB;

UPDATE "Template"
SET "sourceType" = 'STARTER'
WHERE "sourceType" IS NULL;

CREATE INDEX IF NOT EXISTS "Template_tenantId_idx" ON "Template"("tenantId");
CREATE INDEX IF NOT EXISTS "Template_sourceType_idx" ON "Template"("sourceType");
CREATE INDEX IF NOT EXISTS "Template_tenantId_sourceType_idx" ON "Template"("tenantId", "sourceType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Template_tenantId_fkey'
      AND table_name = 'Template'
  ) THEN
    ALTER TABLE "Template"
      ADD CONSTRAINT "Template_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Template_createdBy_fkey'
      AND table_name = 'Template'
  ) THEN
    ALTER TABLE "Template"
      ADD CONSTRAINT "Template_createdBy_fkey"
      FOREIGN KEY ("createdBy") REFERENCES "AdminUser"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
