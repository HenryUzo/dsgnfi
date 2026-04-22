import type { PrismaClient } from "@prisma/client";

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
    content: page.currentDraftRevision.content,
  };
}
