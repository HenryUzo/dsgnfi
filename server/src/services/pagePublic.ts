import type { PrismaClient } from "@prisma/client";

import { toPageHierarchyPayload } from "./pageHierarchy";

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

  if (!page.isVisible) {
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
    pageKey: page.pageKey,
    title: page.title,
    slug: page.slug,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    status: page.status,
    publishedAt: page.currentPublishedRevision.publishedAt,
    hierarchy: toPageHierarchyPayload(page, defaultParent),
    content: page.currentPublishedRevision.content,
    revisionNumber: page.currentPublishedRevision.revisionNumber,
  };
}

export async function getPublishedPageBySlug(
  prisma: PrismaClient,
  options: { siteId: string; slug: string }
) {
  const page = await prisma.page.findFirst({
    where: {
      siteId: options.siteId,
      slug: options.slug,
    },
    include: {
      currentPublishedRevision: true,
    },
  });

  if (!page || !page.currentPublishedRevision) {
    return null;
  }

  if (!page.isVisible) {
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
    pageKey: page.pageKey,
    title: page.title,
    slug: page.slug,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    status: page.status,
    publishedAt: page.currentPublishedRevision.publishedAt,
    hierarchy: toPageHierarchyPayload(page, defaultParent),
    content: page.currentPublishedRevision.content,
    revisionNumber: page.currentPublishedRevision.revisionNumber,
  };
}
