-- CreateEnum
CREATE TYPE "PageHierarchyRole" AS ENUM ('MAIN', 'INNER');

-- AlterTable
ALTER TABLE "Page"
ADD COLUMN "defaultParentPageKey" TEXT,
ADD COLUMN "hierarchyRole" "PageHierarchyRole" NOT NULL DEFAULT 'MAIN';
