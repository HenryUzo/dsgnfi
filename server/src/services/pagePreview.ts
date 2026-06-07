import type { PrismaClient } from "@prisma/client";

import { toPageHierarchyPayload } from "./pageHierarchy";

export async function getPreviewPageDraft(
  prisma: PrismaClient,
  options: { siteId: string; pageKey: string }
) {
  const page = await prisma.page.findUnique({
    where: {
      siteId_pageKey: {
        siteId: options.siteId,
        pageKey: options.pageKey,
      },
    },
    include: {
      currentDraftRevision: true,
    },
  });

  if (!page || !page.currentDraftRevision) {
    return null;
  }

  const defaultParent = page.defaultParentPageKey
    ? await prisma.page.findUnique({
        where: {
          siteId_pageKey: {
            siteId: options.siteId,
            pageKey: page.defaultParentPageKey,
          },
        },
        select: {
          title: true,
          slug: true,
        },
      })
    : null;

  return {
    id: page.id,
    pageKey: page.pageKey,
    title: page.title,
    slug: page.slug,
    status: page.status,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    updatedAt: page.updatedAt,
    revisionNumber: page.currentDraftRevision.revisionNumber,
    hierarchy: toPageHierarchyPayload(page, defaultParent),
    content: page.currentDraftRevision.content,
  };
}
