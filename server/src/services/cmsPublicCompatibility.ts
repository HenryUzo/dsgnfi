import type { PrismaClient } from "@prisma/client";

import { getPublishedProcessForPublic } from "./processCompatibility";

function isEmptyObject(value: unknown) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  );
}

export async function getPublicCmsSection(
  prisma: PrismaClient,
  options: { siteId: string; page: string; section: string }
) {
  if (options.page === "process" && options.section === "content") {
    return getPublishedProcessForPublic(prisma, { siteId: options.siteId });
  }

  const record = await prisma.cmsSection.findUnique({
    where: {
      siteId_page_section: {
        siteId: options.siteId,
        page: options.page,
        section: options.section,
      },
    },
  });

  return record?.status === "PUBLISHED" ? record.publishedData ?? null : null;
}

export async function getPreviewCmsSection(
  prisma: PrismaClient,
  options: { siteId: string; page: string; section: string }
) {
  const record = await prisma.cmsSection.findUnique({
    where: {
      siteId_page_section: {
        siteId: options.siteId,
        page: options.page,
        section: options.section,
      },
    },
  });

  if (!record) {
    return null;
  }

  if (!isEmptyObject(record.draftData)) {
    return record.draftData ?? null;
  }

  if (!isEmptyObject(record.publishedData)) {
    return record.publishedData ?? null;
  }

  return null;
}
