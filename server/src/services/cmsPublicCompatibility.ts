import type { PrismaClient } from "@prisma/client";

import { getPublishedProcessForPublic } from "./processCompatibility";

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
