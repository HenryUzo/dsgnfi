import crypto from "crypto";

import type { Prisma, PrismaClient } from "@prisma/client";

import {
  buildCustomPageKeyFromSlug,
  ensurePageLineageForSite,
  ensureStarterPagesForSite,
  getAddablePageTemplateForSite,
  getBlueprintStatusForPage,
  getSiteTemplateSelection,
  getSupportedPageForSite,
  listSupportedPagesForSite,
  isReservedPublicPageSlug,
  listAddablePageTemplatesForSite,
  normalizePageSlug,
  resolvePageLineage,
  toPageCreationPayload,
} from "./pageCatalog";
import {
  validatePageCreateInput,
  validatePageContent,
  validatePageDraftInput,
} from "./pageValidation";
import {
  assertValidPageHierarchy,
  listSiteHierarchyPages,
  toPageHierarchyPayload,
} from "./pageHierarchy";
import {
  getLegacyPageCompatibilityDetails,
  getLegacyPageCompatibilityStatus,
  type PageCompatibilityStatus,
  resolvePageEditorState,
} from "./pageEditorResolution";
import { writeAuditLog } from "./auditLog";
import { ApiRequestError } from "./apiErrors";

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function checksumForContent(content: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function isAllowedReservedSlug(pageKey: string, slug: string) {
  return (
    (pageKey === "home" && slug === "/") ||
    (pageKey === "contact" && slug === "/contact") ||
    (pageKey === "studio" && slug === "/studio") ||
    (pageKey === "process" && slug === "/process") ||
    (pageKey === "work" && slug === "/work")
  );
}

function buildDuplicateTitle(title: string) {
  const trimmed = title.trim();
  return trimmed ? `${trimmed} Copy` : "Untitled Copy";
}

async function findAvailableDuplicateSlug(
  prisma: PrismaClient | Prisma.TransactionClient,
  options: { siteId: string; baseSlug: string }
) {
  const normalizedBase = normalizePageSlug(options.baseSlug);
  const root = normalizedBase === "/" ? "/page" : normalizedBase;

  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = `${root}-copy${attempt > 1 ? `-${attempt}` : ""}`;
    const existing = await prisma.page.findFirst({
      where: {
        siteId: options.siteId,
        slug: candidate,
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new ApiRequestError(
    409,
    "page_duplicate_slug_conflict",
    "Unable to create a duplicate page with a unique slug."
  );
}

function removePageFromNavigationItems(value: unknown, pageKey: string) {
  if (!Array.isArray(value)) {
    return value ?? [];
  }

  return value.filter((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return true;
    }

    return (entry as { pageKey?: unknown }).pageKey !== pageKey;
  });
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

async function runInTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
) {
  const maybePrisma = prisma as PrismaClient & {
    $transaction?: <Result>(
      txCallback: (tx: Prisma.TransactionClient) => Promise<Result>
    ) => Promise<Result>;
  };

  if (typeof maybePrisma.$transaction === "function") {
    return maybePrisma.$transaction(callback);
  }

  return callback(prisma as unknown as Prisma.TransactionClient);
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
      sourceTemplate: {
        include: {
          versions: true,
        },
      },
      sourceTemplateVersion: true,
    },
  });
}

function toPageLineagePayload(page: {
  pageTemplateKey?: string | null;
  sourcePageBlueprintKey?: string | null;
  sourceTemplate?: { key: string; name: string } | null;
  sourceTemplateVersion?: { version: string } | null;
  lineageStatus?: "UNTRACKED" | "INHERITED" | "MODIFIED";
}) {
  const sourceTemplate = page.sourceTemplate ?? null;
  const sourceTemplateVersion = page.sourceTemplateVersion ?? null;
  const isTracked = Boolean(
    sourceTemplate && sourceTemplateVersion && page.sourcePageBlueprintKey
  );

  return {
    sourceTemplateKey: sourceTemplate?.key ?? null,
    sourceTemplateName: sourceTemplate?.name ?? null,
    sourceTemplateVersion: sourceTemplateVersion?.version ?? null,
    sourcePageBlueprintKey: page.sourcePageBlueprintKey ?? page.pageTemplateKey ?? null,
    status: isTracked ? page.lineageStatus ?? "UNTRACKED" : "UNTRACKED",
    isTracked,
  };
}

function toCompatibilityStatus(
  status: "DRAFT" | "PUBLISHED" | null | undefined
): PageCompatibilityStatus {
  if (status === "DRAFT" || status === "PUBLISHED") {
    return status;
  }

  return "NONE";
}

async function getDefaultParentForPage(
  prisma: PrismaClient,
  siteId: string,
  defaultParentPageKey?: string | null
) {
  if (!defaultParentPageKey) {
    return null;
  }

  return prisma.page.findUnique({
    where: {
      siteId_pageKey: {
        siteId,
        pageKey: defaultParentPageKey,
      },
    },
    select: {
      title: true,
      slug: true,
    },
  });
}

async function toAdminPagePayload(
  prisma: PrismaClient,
  siteId: string,
  page: NonNullable<Awaited<ReturnType<typeof getScopedPage>>>,
  pageDefinition?:
    | {
        allowedBlockTypes: string[];
        isRequired?: boolean;
        defaultBlocks?: unknown[];
      }
    | null,
  defaultParent?: { title: string; slug: string } | null
) {
  const isRequired = Boolean(pageDefinition?.isRequired);
  const legacyStatus = await getLegacyPageCompatibilityStatus(prisma, {
    siteId,
    pageKey: page.pageKey,
  });
  const editorResolution = await resolvePageEditorState({
    prisma,
    siteId,
    pageKey: page.pageKey,
    page,
    pageDefinition: pageDefinition ?? null,
  });

  return {
    id: page.id,
    pageKey: page.pageKey,
    pageTemplateKey: page.pageTemplateKey,
    title: page.title,
    slug: page.slug,
    isVisible: page.isVisible,
    isRequired,
    canDelete: !isRequired,
    status: page.status,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    updatedAt: page.updatedAt,
    modernStatus: toCompatibilityStatus(page.status),
    legacyStatus,
    draftRevisionNumber: page.currentDraftRevision?.revisionNumber ?? null,
    publishedRevisionNumber: page.currentPublishedRevision?.revisionNumber ?? null,
    publishedAt: page.currentPublishedRevision?.publishedAt ?? null,
    allowedBlockTypes: pageDefinition?.allowedBlockTypes ?? [],
    lineage: toPageLineagePayload(page),
    hierarchy: toPageHierarchyPayload(page, defaultParent),
    editorResolution,
    content:
      (page.currentDraftRevision?.content as { blocks?: unknown[] } | null) ?? {
        blocks: [],
      },
  };
}

export async function listAdminPages(prisma: PrismaClient, siteId: string) {
  await ensureStarterPagesForSite(prisma, { siteId });
  await ensurePageLineageForSite(prisma, siteId);
  const supportedPages = await listSupportedPagesForSite(prisma, siteId);
  const supportedPageMap = new Map(
    supportedPages.map((pageDefinition) => [pageDefinition.pageKey, pageDefinition])
  );

  const pages = await prisma.page.findMany({
    where: { siteId },
    include: {
      currentDraftRevision: {
        select: { revisionNumber: true, content: true },
      },
      currentPublishedRevision: {
        select: { revisionNumber: true, publishedAt: true, content: true },
      },
      sourceTemplate: {
        select: { key: true, name: true, sourceType: true },
      },
      sourceTemplateVersion: {
        select: { version: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const legacyHomeCompatibility = await getLegacyPageCompatibilityDetails(prisma, {
    siteId,
    pageKey: "home",
  });
  const pageMap = new Map(pages.map((page) => [page.pageKey, page]));

  return Promise.all(
    pages.map(async (page) => {
      const pageDefinition = supportedPageMap.get(page.pageKey) ?? null;
      const editorResolution = await resolvePageEditorState({
        prisma,
        siteId,
        pageKey: page.pageKey,
        page,
        pageDefinition,
        legacyHomeSections: page.pageKey === "home" ? undefined : [],
      });

      return {
        ...(pageDefinition
          ? {
              isRequired: Boolean(pageDefinition.isRequired),
              canDelete: !pageDefinition.isRequired,
            }
          : {
              isRequired: false,
              canDelete: true,
            }),
        id: page.id,
        pageKey: page.pageKey,
        title: page.title,
        slug: page.slug,
        isVisible: page.isVisible,
        status:
          page.pageKey === "home" && legacyHomeCompatibility.status !== "NONE"
            ? legacyHomeCompatibility.status
            : page.status,
        modernStatus: toCompatibilityStatus(page.status),
        legacyStatus:
          page.pageKey === "home"
            ? legacyHomeCompatibility.status
            : ("NONE" as const),
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        updatedAt: page.updatedAt,
        draftRevisionNumber: page.currentDraftRevision?.revisionNumber ?? null,
        publishedRevisionNumber: page.currentPublishedRevision?.revisionNumber ?? null,
        publishedAt:
          page.pageKey === "home" && legacyHomeCompatibility.status === "PUBLISHED"
            ? legacyHomeCompatibility.publishedAt
            : page.currentPublishedRevision?.publishedAt ?? null,
        lineage: toPageLineagePayload(page),
        hierarchy: toPageHierarchyPayload(
          page,
          page.defaultParentPageKey ? pageMap.get(page.defaultParentPageKey) ?? null : null
        ),
        editorResolution,
      };
    })
  );
}

export async function listAdminAddablePageTemplates(
  prisma: PrismaClient,
  siteId: string
) {
  const templates = await listAddablePageTemplatesForSite(prisma, siteId);

  return templates.map((template) => ({
    templateKey: template.templateKey,
    label: template.label,
    description: template.description,
    defaultTitle: template.defaultTitle,
    allowedBlockTypes: template.allowedBlockTypes,
  }));
}

export async function createAdminPage(
  prisma: PrismaClient,
  options: {
    siteId: string;
    adminId: string;
    payload: unknown;
  }
) {
  const validation = validatePageCreateInput(options.payload);
  if (!validation.success) {
    return { type: "validation_error" as const, error: validation.error };
  }

  const pageTemplate = await getAddablePageTemplateForSite(
    prisma,
    options.siteId,
    validation.data.templateKey
  );

  if (!pageTemplate) {
    return { type: "template_not_found" as const };
  }

  const lineageSource = await getSiteTemplateSelection(prisma, options.siteId);
  const normalizedSlug = normalizePageSlug(validation.data.slug);
  const pageKey = buildCustomPageKeyFromSlug(normalizedSlug);
  const hierarchyRole = validation.data.hierarchyRole ?? "MAIN";
  const defaultParentPageKey =
    hierarchyRole === "INNER" ? validation.data.defaultParentPageKey ?? null : null;

  assertValidPageHierarchy({
    pages: [
      ...(await listSiteHierarchyPages(prisma, options.siteId)),
      {
        pageKey,
        title: validation.data.title,
        slug: normalizedSlug,
        hierarchyRole: "MAIN",
        defaultParentPageKey: null,
      },
    ],
    pageKey,
    nextRole: hierarchyRole,
    nextDefaultParentPageKey: defaultParentPageKey,
  });

  if (isReservedPublicPageSlug(normalizedSlug)) {
    throw new ApiRequestError(
      400,
      "page_slug_reserved",
      "That slug is reserved by an existing public route."
    );
  }

  const existingSlug = await prisma.page.findFirst({
    where: {
      siteId: options.siteId,
      slug: normalizedSlug,
    },
    select: { id: true },
  });

  if (existingSlug) {
    throw new ApiRequestError(
      409,
      "page_slug_taken",
      "A page with that slug already exists."
    );
  }

  const createdPage = await runInTransaction(prisma, async (tx) => {
    const page = await tx.page.create({
      data: toPageCreationPayload(pageTemplate, {
        siteId: options.siteId,
        title: validation.data.title,
        slug: normalizedSlug,
        seoTitle: validation.data.seoTitle ?? null,
        seoDescription: validation.data.seoDescription ?? null,
        isVisible: validation.data.isVisible ?? true,
        hierarchyRole,
        defaultParentPageKey,
        sourceTemplateId: lineageSource?.template.id ?? null,
        sourceTemplateVersionId: lineageSource?.templateVersion.id ?? null,
      }),
    });

    const revision = await tx.pageRevision.create({
      data: {
        pageId: page.id,
        revisionNumber: 1,
        state: "DRAFT",
        content: toJsonInput({ blocks: pageTemplate.defaultBlocks }),
        schemaVersion: 1,
        checksum: checksumForContent({ blocks: pageTemplate.defaultBlocks }),
        createdBy: options.adminId,
      },
    });

    const updated = await tx.page.update({
      where: { id: page.id },
      data: {
        currentDraftRevisionId: revision.id,
      },
      include: {
        currentDraftRevision: true,
        currentPublishedRevision: true,
        sourceTemplate: {
          include: {
            versions: true,
          },
        },
        sourceTemplateVersion: true,
      },
    });

    await writeAuditLog(tx as unknown as PrismaClient, {
      actorAdminUserId: options.adminId,
      siteId: options.siteId,
      action: "page.created",
      entityType: "page",
      entityId: updated.id,
      metadata: {
        pageKey: updated.pageKey,
        slug: updated.slug,
        templateKey: pageTemplate.templateKey,
      },
    });

    return updated;
  });

  return {
    type: "success" as const,
    page: await toAdminPagePayload(
      prisma,
      options.siteId,
      createdPage,
      pageTemplate,
      await getDefaultParentForPage(prisma, options.siteId, createdPage.defaultParentPageKey)
    ),
  };
}

export async function getAdminPageDraft(
  prisma: PrismaClient,
  options: { siteId: string; pageKey: string }
) {
  await ensurePageLineageForSite(prisma, options.siteId);
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

  return toAdminPagePayload(
    prisma,
    options.siteId,
    page,
    pageDefinition,
    await getDefaultParentForPage(prisma, options.siteId, page.defaultParentPageKey)
  );
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
  await ensurePageLineageForSite(prisma, options.siteId);

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

  const updatedPage = await runInTransaction(prisma, async (tx) => {
    const client = tx as unknown as PrismaClient;

    await ensureStarterPagesForSite(client, {
      siteId: options.siteId,
      adminId: options.adminId,
    });

    const page = await tx.page.findUnique({
      where: {
        siteId_pageKey: {
          siteId: options.siteId,
          pageKey: options.pageKey,
        },
      },
      include: {
        currentDraftRevision: true,
        currentPublishedRevision: true,
        sourceTemplate: {
          include: {
            versions: true,
          },
        },
        sourceTemplateVersion: true,
      },
    });

    if (!page) {
      return null;
    }

    const hierarchyPages = await listSiteHierarchyPages(client, options.siteId);
    assertValidPageHierarchy({
      pages: hierarchyPages,
      pageKey: page.pageKey,
      nextRole: page.hierarchyRole,
      nextDefaultParentPageKey: page.defaultParentPageKey,
    });

    const normalizedSlug = normalizePageSlug(validation.data.slug);
    if (
      isReservedPublicPageSlug(normalizedSlug) &&
      !isAllowedReservedSlug(page.pageKey, normalizedSlug)
    ) {
      throw new ApiRequestError(
        400,
        "page_slug_reserved",
        "That slug is reserved by an existing public route."
      );
    }

    const existingSlug = await tx.page.findFirst({
      where: {
        siteId: options.siteId,
        slug: normalizedSlug,
      },
      select: { id: true },
    });

    if (existingSlug && existingSlug.id !== page.id) {
      throw new ApiRequestError(
        409,
        "page_slug_taken",
        "A page with that slug already exists."
      );
    }

    const lineage = await resolvePageLineage(client, page);
    const nextLineageStatus = lineage
      ? getBlueprintStatusForPage(
          {
            title: validation.data.title,
            slug: normalizedSlug,
            seoTitle: validation.data.seoTitle ?? null,
            seoDescription: validation.data.seoDescription ?? null,
            allowedBlockTypes: page.allowedBlockTypes,
            currentDraftRevision: { content: validation.data.content },
            currentPublishedRevision: page.currentPublishedRevision,
          },
          lineage.blueprint
        )
      : page.lineageStatus;

    const nextRevisionNumber = await getNextRevisionNumber(client, page.id);
    const revision = await tx.pageRevision.create({
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

    return tx.page.update({
      where: { id: page.id },
      data: {
        title: validation.data.title,
        slug: normalizedSlug,
        seoTitle: validation.data.seoTitle ?? null,
        seoDescription: validation.data.seoDescription ?? null,
        status: page.currentPublishedRevisionId ? page.status : "DRAFT",
        lineageStatus: nextLineageStatus,
        currentDraftRevisionId: revision.id,
      },
      include: {
        currentDraftRevision: true,
        currentPublishedRevision: true,
        sourceTemplate: {
          include: {
            versions: true,
          },
        },
        sourceTemplateVersion: true,
      },
    });
  });

  if (!updatedPage) {
    return { type: "not_found" as const };
  }

  return {
    type: "success" as const,
    page: await toAdminPagePayload(
      prisma,
      options.siteId,
      updatedPage,
      pageDefinition,
      await getDefaultParentForPage(prisma, options.siteId, updatedPage.defaultParentPageKey)
    ),
  };
}

export async function updateAdminPageMeta(
  prisma: PrismaClient,
  options: {
    siteId: string;
    pageKey: string;
    adminId: string;
    payload: {
      title: string;
      slug: string;
      seoTitle?: string | null;
      seoDescription?: string | null;
      hierarchyRole: "MAIN" | "INNER";
      defaultParentPageKey?: string | null;
    };
  }
) {
  await ensurePageLineageForSite(prisma, options.siteId);

  const pageDefinition = await getSupportedPageForSite(
    prisma,
    options.siteId,
    options.pageKey
  );

  if (!pageDefinition) {
    return { type: "not_found" as const };
  }

  const updatedPage = await runInTransaction(prisma, async (tx) => {
    const client = tx as unknown as PrismaClient;
    const page = await getScopedPage(client, options.siteId, options.pageKey);

    if (!page) {
      return null;
    }

    const nextRole = options.payload.hierarchyRole;
    const nextDefaultParentPageKey =
      nextRole === "INNER" ? options.payload.defaultParentPageKey ?? null : null;
    const hierarchyPages = await listSiteHierarchyPages(client, options.siteId);
    assertValidPageHierarchy({
      pages: hierarchyPages,
      pageKey: page.pageKey,
      nextRole,
      nextDefaultParentPageKey,
    });

    const normalizedSlug = normalizePageSlug(options.payload.slug);
    if (
      isReservedPublicPageSlug(normalizedSlug) &&
      !isAllowedReservedSlug(page.pageKey, normalizedSlug)
    ) {
      throw new ApiRequestError(
        400,
        "page_slug_reserved",
        "That slug is reserved by an existing public route."
      );
    }

    const existingSlug = await tx.page.findFirst({
      where: {
        siteId: options.siteId,
        slug: normalizedSlug,
      },
      select: { id: true },
    });

    if (existingSlug && existingSlug.id !== page.id) {
      throw new ApiRequestError(
        409,
        "page_slug_taken",
        "A page with that slug already exists."
      );
    }

    const lineage = await resolvePageLineage(client, page);
    const nextLineageStatus = lineage
      ? getBlueprintStatusForPage(
          {
            title: options.payload.title,
            slug: normalizedSlug,
            seoTitle: options.payload.seoTitle ?? null,
            seoDescription: options.payload.seoDescription ?? null,
            allowedBlockTypes: page.allowedBlockTypes,
            currentDraftRevision: page.currentDraftRevision,
            currentPublishedRevision: page.currentPublishedRevision,
          },
          lineage.blueprint
        )
      : page.lineageStatus;

    const updated = await tx.page.update({
      where: { id: page.id },
      data: {
        title: options.payload.title,
        slug: normalizedSlug,
        seoTitle: options.payload.seoTitle ?? null,
        seoDescription: options.payload.seoDescription ?? null,
        hierarchyRole: nextRole,
        defaultParentPageKey: nextDefaultParentPageKey,
        lineageStatus: nextLineageStatus,
      },
      include: {
        currentDraftRevision: true,
        currentPublishedRevision: true,
        sourceTemplate: {
          include: {
            versions: true,
          },
        },
        sourceTemplateVersion: true,
      },
    });

    await writeAuditLog(client, {
      actorAdminUserId: options.adminId,
      siteId: options.siteId,
      action: "page.meta_updated",
      entityType: "page",
      entityId: updated.id,
      metadata: {
        pageKey: updated.pageKey,
        slug: updated.slug,
        title: updated.title,
        hierarchyRole: updated.hierarchyRole,
        defaultParentPageKey: updated.defaultParentPageKey,
      },
    });

    return updated;
  });

  if (!updatedPage) {
    return { type: "not_found" as const };
  }

  return {
    type: "success" as const,
    page: await toAdminPagePayload(
      prisma,
      options.siteId,
      updatedPage,
      pageDefinition,
      await getDefaultParentForPage(prisma, options.siteId, updatedPage.defaultParentPageKey)
    ),
  };
}

export async function renameAdminPageTitle(
  prisma: PrismaClient,
  options: {
    siteId: string;
    pageKey: string;
    adminId: string;
    title: string;
  }
) {
  await ensurePageLineageForSite(prisma, options.siteId);

  const pageDefinition = await getSupportedPageForSite(
    prisma,
    options.siteId,
    options.pageKey
  );

  if (!pageDefinition) {
    return { type: "not_found" as const };
  }

  const nextTitle = options.title.trim();
  if (!nextTitle) {
    throw new ApiRequestError(400, "page_title_required", "Page title is required.");
  }

  const updatedPage = await runInTransaction(prisma, async (tx) => {
    const client = tx as unknown as PrismaClient;
    const page = await getScopedPage(client, options.siteId, options.pageKey);

    if (!page) {
      return null;
    }

    const lineage = await resolvePageLineage(client, page);
    const nextLineageStatus = lineage
      ? getBlueprintStatusForPage(
          {
            title: nextTitle,
            slug: page.slug,
            seoTitle: page.seoTitle,
            seoDescription: page.seoDescription,
            allowedBlockTypes: page.allowedBlockTypes,
            currentDraftRevision: page.currentDraftRevision,
            currentPublishedRevision: page.currentPublishedRevision,
          },
          lineage.blueprint
        )
      : page.lineageStatus;

    const updated = await tx.page.update({
      where: { id: page.id },
      data: {
        title: nextTitle,
        lineageStatus: nextLineageStatus,
      },
      include: {
        currentDraftRevision: true,
        currentPublishedRevision: true,
        sourceTemplate: {
          include: {
            versions: true,
          },
        },
        sourceTemplateVersion: true,
      },
    });

    await writeAuditLog(client, {
      actorAdminUserId: options.adminId,
      siteId: options.siteId,
      action: "page.title_updated",
      entityType: "page",
      entityId: updated.id,
      metadata: {
        pageKey: updated.pageKey,
        slug: updated.slug,
        title: updated.title,
      },
    });

    return updated;
  });

  if (!updatedPage) {
    return { type: "not_found" as const };
  }

  return {
    type: "success" as const,
    page: await toAdminPagePayload(
      prisma,
      options.siteId,
      updatedPage,
      pageDefinition,
      await getDefaultParentForPage(prisma, options.siteId, updatedPage.defaultParentPageKey)
    ),
  };
}

export async function setAdminPageVisibility(
  prisma: PrismaClient,
  options: {
    siteId: string;
    pageKey: string;
    adminId: string;
    isVisible: boolean;
  }
) {
  await ensurePageLineageForSite(prisma, options.siteId);

  const pageDefinition = await getSupportedPageForSite(
    prisma,
    options.siteId,
    options.pageKey
  );

  if (!pageDefinition) {
    return { type: "not_found" as const };
  }

  if (options.pageKey === "home" && !options.isVisible) {
    throw new ApiRequestError(
      400,
      "page_visibility_home_required",
      "The homepage cannot be hidden."
    );
  }

  const updatedPage = await runInTransaction(prisma, async (tx) => {
    const client = tx as unknown as PrismaClient;
    const page = await getScopedPage(client, options.siteId, options.pageKey);

    if (!page) {
      return null;
    }

    const updated = await tx.page.update({
      where: { id: page.id },
      data: {
        isVisible: options.isVisible,
      },
      include: {
        currentDraftRevision: true,
        currentPublishedRevision: true,
        sourceTemplate: {
          include: {
            versions: true,
          },
        },
        sourceTemplateVersion: true,
      },
    });

    const siteSettings = await tx.siteSettings.findUnique({
      where: { siteId: options.siteId },
      select: {
        id: true,
        primaryNavigation: true,
        footerNavigation: true,
      },
    });

    if (siteSettings && !options.isVisible) {
      await tx.siteSettings.update({
        where: { id: siteSettings.id },
        data: {
          primaryNavigation: toJsonInput(
            removePageFromNavigationItems(siteSettings.primaryNavigation, options.pageKey)
          ),
          footerNavigation: toJsonInput(
            removePageFromNavigationItems(siteSettings.footerNavigation, options.pageKey)
          ),
        },
      });
    }

    await writeAuditLog(client, {
      actorAdminUserId: options.adminId,
      siteId: options.siteId,
      action: options.isVisible ? "page.shown" : "page.hidden",
      entityType: "page",
      entityId: updated.id,
      metadata: {
        pageKey: updated.pageKey,
        isVisible: updated.isVisible,
      },
    });

    return updated;
  });

  if (!updatedPage) {
    return { type: "not_found" as const };
  }

  return {
    type: "success" as const,
    page: await toAdminPagePayload(
      prisma,
      options.siteId,
      updatedPage,
      pageDefinition,
      await getDefaultParentForPage(prisma, options.siteId, updatedPage.defaultParentPageKey)
    ),
  };
}

export async function duplicateAdminPage(
  prisma: PrismaClient,
  options: {
    siteId: string;
    pageKey: string;
    adminId: string;
  }
) {
  await ensurePageLineageForSite(prisma, options.siteId);

  const duplicatedPage = await runInTransaction(prisma, async (tx) => {
    const client = tx as unknown as PrismaClient;
    const page = await getScopedPage(client, options.siteId, options.pageKey);

    if (!page || !page.currentDraftRevision) {
      return null;
    }

    const duplicateSlug = await findAvailableDuplicateSlug(tx, {
      siteId: options.siteId,
      baseSlug: page.slug,
    });
    const duplicateTitle = buildDuplicateTitle(page.title);
    const duplicatePageKey = buildCustomPageKeyFromSlug(duplicateSlug);
    const duplicateContent =
      (page.currentDraftRevision.content as { blocks?: unknown[] } | null) ?? { blocks: [] };

    const created = await tx.page.create({
      data: {
        siteId: options.siteId,
        pageKey: duplicatePageKey,
        pageTemplateKey: page.pageTemplateKey,
        sourceTemplateId: page.sourceTemplateId,
        sourceTemplateVersionId: page.sourceTemplateVersionId,
        sourcePageBlueprintKey: page.sourcePageBlueprintKey,
        lineageStatus:
          page.sourceTemplateId && page.sourceTemplateVersionId && page.sourcePageBlueprintKey
            ? "MODIFIED"
            : page.lineageStatus,
        hierarchyRole: page.hierarchyRole,
        defaultParentPageKey: page.defaultParentPageKey,
        allowedBlockTypes: toJsonInput(page.allowedBlockTypes ?? []),
        isVisible: true,
        slug: duplicateSlug,
        title: duplicateTitle,
        status: "DRAFT",
        seoTitle: page.seoTitle ? buildDuplicateTitle(page.seoTitle) : duplicateTitle,
        seoDescription: page.seoDescription,
      },
    });

    const revision = await tx.pageRevision.create({
      data: {
        pageId: created.id,
        revisionNumber: 1,
        state: "DRAFT",
        content: toJsonInput(duplicateContent),
        schemaVersion: page.currentDraftRevision.schemaVersion,
        checksum: checksumForContent(duplicateContent),
        createdBy: options.adminId,
      },
    });

    const updated = await tx.page.update({
      where: { id: created.id },
      data: {
        currentDraftRevisionId: revision.id,
      },
      include: {
        currentDraftRevision: true,
        currentPublishedRevision: true,
        sourceTemplate: {
          include: {
            versions: true,
          },
        },
        sourceTemplateVersion: true,
      },
    });

    await writeAuditLog(client, {
      actorAdminUserId: options.adminId,
      siteId: options.siteId,
      action: "page.duplicated",
      entityType: "page",
      entityId: updated.id,
      metadata: {
        sourcePageKey: page.pageKey,
        pageKey: updated.pageKey,
        slug: updated.slug,
      },
    });

    return updated;
  });

  if (!duplicatedPage) {
    return { type: "not_found" as const };
  }

  const pageDefinition = await getSupportedPageForSite(
    prisma,
    options.siteId,
    duplicatedPage.pageKey
  );

  return {
    type: "success" as const,
    page: await toAdminPagePayload(
      prisma,
      options.siteId,
      duplicatedPage,
      pageDefinition,
      await getDefaultParentForPage(prisma, options.siteId, duplicatedPage.defaultParentPageKey)
    ),
  };
}

export async function deleteAdminPage(
  prisma: PrismaClient,
  options: {
    siteId: string;
    pageKey: string;
    adminId: string;
  }
) {
  await ensurePageLineageForSite(prisma, options.siteId);

  const pageDefinition = await getSupportedPageForSite(
    prisma,
    options.siteId,
    options.pageKey
  );

  if (!pageDefinition) {
    return { type: "not_found" as const };
  }

  if (pageDefinition.isRequired) {
    throw new ApiRequestError(
      400,
      "page_delete_required_not_allowed",
      "This page is required by the current site template and cannot be deleted."
    );
  }

  const deletedPage = await runInTransaction(prisma, async (tx) => {
    const client = tx as unknown as PrismaClient;
    const page = await getScopedPage(client, options.siteId, options.pageKey);

    if (!page) {
      return null;
    }

    const siteSettings = await tx.siteSettings.findUnique({
      where: { siteId: options.siteId },
      select: {
        id: true,
        primaryNavigation: true,
        footerNavigation: true,
      },
    });

    if (siteSettings) {
      await tx.siteSettings.update({
        where: { id: siteSettings.id },
        data: {
          primaryNavigation: toJsonInput(
            removePageFromNavigationItems(siteSettings.primaryNavigation, options.pageKey)
          ),
          footerNavigation: toJsonInput(
            removePageFromNavigationItems(siteSettings.footerNavigation, options.pageKey)
          ),
        },
      });
    }

    await tx.page.updateMany({
      where: {
        siteId: options.siteId,
        defaultParentPageKey: page.pageKey,
      },
      data: {
        hierarchyRole: "MAIN",
        defaultParentPageKey: null,
      },
    });

    await writeAuditLog(client, {
      actorAdminUserId: options.adminId,
      siteId: options.siteId,
      action: "page.deleted",
      entityType: "page",
      entityId: page.id,
      metadata: {
        pageKey: page.pageKey,
        slug: page.slug,
        title: page.title,
      },
    });

    await tx.page.delete({
      where: { id: page.id },
    });

    return {
      id: page.id,
      pageKey: page.pageKey,
      title: page.title,
    };
  });

  if (!deletedPage) {
    return { type: "not_found" as const };
  }

  return {
    type: "success" as const,
    page: deletedPage,
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
  await ensurePageLineageForSite(prisma, options.siteId);

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

  const draftRevision = page.currentDraftRevision;
  const validation = validatePageContent(
    pageDefinition,
    draftRevision.content
  );

  if (!validation.success) {
    return { type: "validation_error" as const, error: validation.error };
  }

  const publishedAt = new Date();
  const updatedPage = await runInTransaction(
    prisma,
    async (tx) => {
      const client = tx as unknown as PrismaClient;
      const nextRevisionNumber = await getNextRevisionNumber(client, page.id);
      const publishedRevision = await tx.pageRevision.create({
        data: {
          pageId: page.id,
          revisionNumber: nextRevisionNumber,
          state: "PUBLISHED",
          content: toJsonInput(validation.data),
          schemaVersion: draftRevision.schemaVersion,
          checksum: checksumForContent(validation.data),
          createdBy: draftRevision.createdBy ?? options.adminId,
          publishedBy: options.adminId,
          publishedAt,
        },
      });

      const updatedPage = await tx.page.update({
        where: { id: page.id },
        data: {
          status: "PUBLISHED",
          currentPublishedRevisionId: publishedRevision.id,
        },
        include: {
          currentDraftRevision: true,
          currentPublishedRevision: true,
          sourceTemplate: {
            include: {
              versions: true,
            },
          },
          sourceTemplateVersion: true,
        },
      });

      await writeAuditLog(client, {
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

      return updatedPage;
    }
  );

  return {
    type: "success" as const,
    page: await toAdminPagePayload(
      prisma,
      options.siteId,
      updatedPage,
      pageDefinition,
      await getDefaultParentForPage(prisma, options.siteId, updatedPage.defaultParentPageKey)
    ),
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
  await ensurePageLineageForSite(prisma, options.siteId);

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

  const updatedPage = await runInTransaction(prisma, async (tx) => {
    const client = tx as unknown as PrismaClient;
    const nextRevisionNumber = await getNextRevisionNumber(client, page.id);
    const restoredRevision = await tx.pageRevision.create({
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

    return tx.page.update({
      where: { id: page.id },
      data: {
        lineageStatus:
          page.sourceTemplateId && page.sourceTemplateVersionId && page.sourcePageBlueprintKey
            ? "MODIFIED"
            : page.lineageStatus,
        currentDraftRevisionId: restoredRevision.id,
      },
      include: {
        currentDraftRevision: true,
        currentPublishedRevision: true,
        sourceTemplate: {
          include: {
            versions: true,
          },
        },
        sourceTemplateVersion: true,
      },
    });
  });

  return {
    type: "success" as const,
    page: await toAdminPagePayload(
      prisma,
      options.siteId,
      updatedPage,
      pageDefinition,
      await getDefaultParentForPage(prisma, options.siteId, updatedPage.defaultParentPageKey)
    ),
  };
}
