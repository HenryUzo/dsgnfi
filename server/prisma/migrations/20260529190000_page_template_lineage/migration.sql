CREATE TYPE "PageTemplateLineageStatus" AS ENUM ('UNTRACKED', 'INHERITED', 'MODIFIED');

ALTER TABLE "Page"
ADD COLUMN "sourceTemplateId" UUID,
ADD COLUMN "sourceTemplateVersionId" UUID,
ADD COLUMN "sourcePageBlueprintKey" TEXT,
ADD COLUMN "lineageStatus" "PageTemplateLineageStatus" NOT NULL DEFAULT 'UNTRACKED';

CREATE INDEX "Page_sourceTemplateId_idx" ON "Page"("sourceTemplateId");
CREATE INDEX "Page_sourceTemplateVersionId_idx" ON "Page"("sourceTemplateVersionId");

ALTER TABLE "Page"
ADD CONSTRAINT "Page_sourceTemplateId_fkey"
FOREIGN KEY ("sourceTemplateId") REFERENCES "Template"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Page"
ADD CONSTRAINT "Page_sourceTemplateVersionId_fkey"
FOREIGN KEY ("sourceTemplateVersionId") REFERENCES "TemplateVersion"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
