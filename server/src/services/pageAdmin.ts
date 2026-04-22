import crypto from "crypto";

import type { Prisma, PrismaClient } from "@prisma/client";

import { ensureStarterPagesForSite, getSupportedPageForSite } from "./pageCatalog";
import {
  validatePageContent,
  validatePageDraftInput,
} from "./pageValidation";
import { writeAuditLog } from "./auditLog";

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function checksumForContent(content: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function toRevisionSummary(revision: {
  id: string;
  revisionNumber: number;
  state: string;
  createdAt: Date;
  createdBy: string | null;
  publishedAt: Date | null;
  publishedBy: string | null;
}) {
  return {
    id: revision.id,
    revisionNumber: revision.revisionNumber,
    state: revision.state,
    createdAt: revision.createdAt,
    createdBy: revision.createdBy,
    publishedAt: revision.publishedAt,
    publishedBy: revision.publishedBy,
  };
}

async function getNextRevisionNumber(prisma: PrismaClient, pageId: string) {
  const latestRevision = await prisma.pageRevision.findFirst({
    where: { pageId },
    orderBy: { revisionNumber: "desc" },
    select: { revisionNumber: true },
  });

  return (latestRevision?.revisionNumber ?? 0) + 1;
}

async function getScopedPage(
  prisma: PrismaClient,
  siteId: string,
  pageKey: string
) {
  return prisma.page.findUnique({
    where: {
      siteId_pageKey: {
        siteId,
        pageKey,
      },
    },
    include: {
      currentDraftRevision: true,
      currentPublishedRevision: true,
    },
  });
}

function toAdminPagePayload(page: NonNullable<Awaited<ReturnType<typeof getScopedPage>>>) {
  return {
    id: page.id,
    pageKey: page.pageKey,
    title: page.title,
    slug: page.slug,
    status: page.status,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    updatedAt: page.updatedAt,
    draftRevisionNumber: page.currentDraftRevision?.revisionNumber ?? null,
    publishedRevisionNumber: page.currentPublishedRevision?.revisionNumber ?? null,
    publishedAt: page.currentPublishedRevision?.publishedAt ?? null,
    content:
      (page.currentDraftRevision?.content as { blocks?: unknown[] } | null) ?? {
        blocks: [],
      },
  };
}

export async function listAdminPages(prisma: PrismaClient, siteId: string) {
  await ensureStarterPagesForSite(prisma, { siteId });

  const pages = await prisma.page.findMany({
    where: { siteId },
    include: {
      currentDraftRevision: {
        select: { revisionNumber: true },
      },
      currentPublishedRevision: {
        select: { revisionNumber: true, publishedAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return pages.map((page) => ({
    id: page.id,
    pageKey: page.pageKey,
    title: page.title,
    slug: page.slug,
    status: page.status,
    updatedAt: page.updatedAt,
    draftRevisionNumber: page.currentDraftRevision?.revisionNumber ?? null,
    publishedRevisionNumber: page.currentPublishedRevision?.revisionNumber ?? null,
    publishedAt: page.currentPublishedRevision?.publishedAt ?? null,
  }));
}

export async function getAdminPageDraft(
  prisma: PrismaClient,
  options: { siteId: string; pageKey: string }
) {
  const pageDefinition = await getSupportedPageForSite(
    prisma,
    options.siteId,
    options.pageKey
  );

  if (!pageDefinition) {
    return null;
  }

  await ensureStarterPagesForSite(prisma, { siteId: options.siteId });

  const page = await getScopedPage(prisma, options.siteId, options.pageKey);
  if (!page) {
    return null;
  }

  return toAdminPagePayload(page);
}

export async function saveAdminPageDraft(
  prisma: PrismaClient,
  options: {
    siteId: string;
    pageKey: string;
    adminId: string;
    payload: unknown;
  }
) {
  const pageDefinition = await getSupportedPageForSite(
    prisma,
    options.siteId,
    options.pageKey
  );

  if (!pageDefinition) {
    return { type: "not_found" as const };
  }

  const validation = validatePageDraftInput(pageDefinition, options.payload);
  if (!validation.success) {
    return { type: "validation_error" as const, error: validation.error };
  }

  await ensureStarterPagesForSite(prisma, {
    siteId: options.siteId,
    adminId: options.adminId,
  });

  const page = await prisma.page.findUnique({
    where: {
      siteId_pageKey: {
        siteId: options.siteId,
        pageKey: options.pageKey,
      },
    },
    include: {
      currentDraftRevision: true,
      currentPublishedRevision: true,
    },
  });

  if (!page) {
    return { type: "not_found" as const };
  }

  const nextRevisionNumber = await getNextRevisionNumber(prisma, page.id);
  const revision = await prisma.pageRevision.create({
    data: {
      pageId: page.id,
      revisionNumber: nextRevisionNumber,
      state: "DRAFT",
      content: toJsonInput(validation.data.content),
      schemaVersion: 1,
      checksum: checksumForContent(validation.data.content),
      createdBy: options.adminId,
    },
  });

  const updatedPage = await prisma.page.update({
    where: { id: page.id },
    data: {
      title: validation.data.title,
      slug: validation.data.slug,
      seoTitle: validation.data.seoTitle ?? null,
      seoDescription: validation.data.seoDescription ?? null,
      status: page.currentPublishedRevisionId ? page.status : "DRAFT",
      currentDraftRevisionId: revision.id,
    },
    include: {
      currentDraftRevision: true,
      currentPublishedRevision: true,
    },
  });

  return {
    type: "success" as const,
    page: toAdminPagePayload(updatedPage),
  };
}

export async function publishAdminPage(
  prisma: PrismaClient,
  options: {
    siteId: string;
    pageKey: string;
    adminId: string;
  }
) {
  const pageDefinition = await getSupportedPageForSite(
    prisma,
    options.siteId,
    options.pageKey
  );

  if (!pageDefinition) {
    return { type: "not_found" as const };
  }

  const page = await getScopedPage(prisma, options.siteId, options.pageKey);
  if (!page || !page.currentDraftRevision) {
    return { type: "not_found" as const };
  }

  const validation = validatePageContent(
    pageDefinition,
    page.currentDraftRevision.content
  );

  if (!validation.success) {
    return { type: "validation_error" as const, error: validation.error };
  }

  const nextRevisionNumber = await getNextRevisionNumber(prisma, page.id);
  const publishedAt = new Date();
  const publishedRevision = await prisma.pageRevision.create({
    data: {
      pageId: page.id,
      revisionNumber: nextRevisionNumber,
      state: "PUBLISHED",
      content: toJsonInput(validation.data),
      schemaVersion: page.currentDraftRevision.schemaVersion,
      checksum: checksumForContent(validation.data),
      createdBy: page.currentDraftRevision.createdBy ?? options.adminId,
      publishedBy: options.adminId,
      publishedAt,
    },
  });

  const updatedPage = await prisma.page.update({
    where: { id: page.id },
    data: {
      status: "PUBLISHED",
      currentPublishedRevisionId: publishedRevision.id,
    },
    include: {
      currentDraftRevision: true,
      currentPublishedRevision: true,
    },
  });

  await writeAuditLog(prisma, {
    actorAdminUserId: options.adminId,
    siteId: options.siteId,
    action: "page.published",
    entityType: "page",
    entityId: updatedPage.id,
    metadata: {
      pageKey: options.pageKey,
      publishedRevisionNumber: publishedRevision.revisionNumber,
      publishedAt: publishedAt.toISOString(),
    },
  });

  return {
    type: "success" as const,
    page: toAdminPagePayload(updatedPage),
  };
}

export async function getAdminPageHistory(
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
    select: { id: true },
  });

  if (!page) {
    return null;
  }

  const revisions = await prisma.pageRevision.findMany({
    where: { pageId: page.id },
    select: {
      id: true,
      revisionNumber: true,
      state: true,
      createdAt: true,
      createdBy: true,
      publishedAt: true,
      publishedBy: true,
    },
    orderBy: { revisionNumber: "desc" },
  });

  return revisions.map(toRevisionSummary);
}

export async function restoreAdminPageRevision(
  prisma: PrismaClient,
  options: {
    siteId: string;
    pageKey: string;
    revisionId: string;
    adminId: string;
  }
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
      currentPublishedRevision: true,
    },
  });

  if (!page) {
    return { type: "not_found" as const };
  }

  const revision = await prisma.pageRevision.findFirst({
    where: {
      id: options.revisionId,
      pageId: page.id,
    },
  });

  if (!revision) {
    return { type: "not_found" as const };
  }

  const pageDefinition = await getSupportedPageForSite(
    prisma,
    options.siteId,
    options.pageKey
  );

  if (!pageDefinition) {
    return { type: "not_found" as const };
  }

  const validation = validatePageContent(pageDefinition, revision.content);
  if (!validation.success) {
    return { type: "validation_error" as const, error: validation.error };
  }

  const nextRevisionNumber = await getNextRevisionNumber(prisma, page.id);
  const restoredRevision = await prisma.pageRevision.create({
    data: {
      pageId: page.id,
      revisionNumber: nextRevisionNumber,
      state: "DRAFT",
      content: toJsonInput(validation.data),
      schemaVersion: revision.schemaVersion,
      checksum: checksumForContent(validation.data),
      createdBy: options.adminId,
    },
  });

  const updatedPage = await prisma.page.update({
    where: { id: page.id },
    data: {
      currentDraftRevisionId: restoredRevision.id,
    },
    include: {
      currentDraftRevision: true,
      currentPublishedRevision: true,
    },
  });

  return {
    type: "success" as const,
    page: toAdminPagePayload(updatedPage),
  };
}
