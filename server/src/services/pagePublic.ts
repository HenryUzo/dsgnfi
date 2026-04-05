import type { PrismaClient } from "@prisma/client";

export async function getPublishedPage(
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
      currentPublishedRevision: true,
    },
  });

  if (!page || !page.currentPublishedRevision) {
    return null;
  }

  return {
    pageKey: page.pageKey,
    title: page.title,
    slug: page.slug,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    status: page.status,
    publishedAt: page.currentPublishedRevision.publishedAt,
    content: page.currentPublishedRevision.content,
    revisionNumber: page.currentPublishedRevision.revisionNumber,
  };
}
