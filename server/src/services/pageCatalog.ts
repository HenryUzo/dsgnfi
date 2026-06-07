import crypto from "crypto";

import type { Prisma, PrismaClient, TemplateSourceType } from "@prisma/client";

import { buildStarterAddablePageTemplates } from "../templates/pageDefaults";
import { getTemplateManifest } from "../templates/registry";
import type {
  AddablePageTemplateDefinition,
  SupportedPageDefinition,
  TemplateManifest,
} from "../templates/types";
import { getEffectiveTemplateManifest } from "./templateCatalog";

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function checksumForContent(content: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function equalUnknown(left: unknown, right: unknown) {
  return stableStringify(left) === stableStringify(right);
}

function normalizeBlockContent(content: unknown) {
  const blocks =
    content && typeof content === "object" && !Array.isArray(content)
      ? (content as { blocks?: unknown }).blocks
      : null;

  return {
    blocks: Array.isArray(blocks) ? blocks : [],
  };
}

function collectBlockTypesFromContent(content: unknown) {
  const normalized = normalizeBlockContent(content);
  return normalized.blocks.reduce<string[]>((types, block) => {
    const type =
      block && typeof block === "object" && !Array.isArray(block)
        ? (block as { type?: unknown }).type
        : null;

    if (typeof type === "string" && !types.includes(type)) {
      types.push(type);
    }

    return types;
  }, []);
}

function normalizeAllowedBlockTypes(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

const reservedPublicSlugs = new Set([
  "/admin",
  "/careers",
  "/contact",
  "/insights",
  "/preview",
  "/privacy-policy",
  "/process",
  "/studio",
  "/work",
]);

function getFallbackSupportedPages(): SupportedPageDefinition[] {
  const manifest = getTemplateManifest("agency-starter");
  if (manifest) {
    return manifest.supportedPages.filter((page) =>
      ["home", "about", "contact"].includes(page.pageKey)
    );
  }

  return [];
}

export async function getSiteTemplateManifest(
  prisma: PrismaClient,
  siteId: string
): Promise<TemplateManifest | null> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      template: {
        include: {
          versions: true,
        },
      },
      templateVersion: true,
    },
  });

  if (!site?.template) {
    return null;
  }

  return getEffectiveTemplateManifest(
    {
      ...site.template,
      versions: site.templateVersion ? [site.templateVersion] : site.template.versions,
    },
    { useDraft: false }
  );
}

export async function getSiteTemplateSelection(prisma: PrismaClient, siteId: string) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      template: {
        include: {
          versions: true,
        },
      },
      templateVersion: true,
    },
  });

  if (!site?.template) {
    return null;
  }

  const templateVersion =
    site.templateVersion ?? site.template.versions.find((version) => version.isActive) ?? null;
  if (!templateVersion) {
    return null;
  }

  const manifest = getEffectiveTemplateManifest(
    {
      ...site.template,
      versions: [templateVersion],
    },
    { useDraft: false }
  );

  if (!manifest) {
    return null;
  }

  return {
    template: site.template,
    templateVersion,
    manifest,
  };
}

export async function listSupportedPagesForSite(
  prisma: PrismaClient,
  siteId: string
) {
  const manifest = await getSiteTemplateManifest(prisma, siteId);
  return manifest?.supportedPages ?? getFallbackSupportedPages();
}

export async function listAddablePageTemplatesForSite(
  prisma: PrismaClient,
  siteId: string
) {
  const manifest = await getSiteTemplateManifest(prisma, siteId);
  if (!manifest) {
    return buildStarterAddablePageTemplates();
  }

  return (
    manifest.addablePageTemplates ??
    buildStarterAddablePageTemplates(manifest.category)
  );
}

export async function getSupportedPageForSite(
  prisma: PrismaClient,
  siteId: string,
  pageKey: string
) {
  const pages = await listSupportedPagesForSite(prisma, siteId);
  const supportedPage = pages.find((page) => page.pageKey === pageKey) ?? null;
  const customPage = await prisma.page.findUnique({
    where: {
      siteId_pageKey: {
        siteId,
        pageKey,
      },
    },
    include: {
      currentDraftRevision: {
        select: { content: true },
      },
      currentPublishedRevision: {
        select: { content: true },
      },
    },
  });

  if (!customPage) {
    return null;
  }

  const allowedBlockTypes = Array.isArray(customPage.allowedBlockTypes)
    ? customPage.allowedBlockTypes.filter(
        (entry): entry is SupportedPageDefinition["allowedBlockTypes"][number] =>
          typeof entry === "string"
      )
    : [];

  const content =
    (customPage.currentDraftRevision?.content as { blocks?: unknown[] } | null) ??
    (customPage.currentPublishedRevision?.content as { blocks?: unknown[] } | null) ??
    { blocks: [] };
  const contentBlockTypes = collectBlockTypesFromContent(content);

  const defaultBlocks = Array.isArray(content.blocks)
    ? (content.blocks as SupportedPageDefinition["defaultBlocks"])
    : [];
  const mergedAllowedBlockTypes = Array.from(
    new Set([
      ...(supportedPage?.allowedBlockTypes ?? []),
      ...allowedBlockTypes,
      ...contentBlockTypes,
    ])
  );

  if (supportedPage) {
    return {
      ...supportedPage,
      title: customPage?.title ?? supportedPage.title,
      slug: customPage?.slug ?? supportedPage.slug,
      allowedBlockTypes:
        mergedAllowedBlockTypes.length > 0
          ? mergedAllowedBlockTypes
          : supportedPage.allowedBlockTypes,
      defaultBlocks:
        defaultBlocks.length > 0 ? defaultBlocks : supportedPage.defaultBlocks,
      seoDefaults: {
        seoTitle: customPage?.seoTitle ?? supportedPage.seoDefaults?.seoTitle,
        seoDescription:
          customPage?.seoDescription ?? supportedPage.seoDefaults?.seoDescription,
      },
    };
  }

  return {
    pageKey: customPage.pageKey,
    title: customPage.title,
    slug: customPage.slug,
    isRequired: false,
    allowedBlockTypes:
      mergedAllowedBlockTypes.length > 0 ? mergedAllowedBlockTypes : allowedBlockTypes,
    defaultBlocks,
    seoDefaults: {
      seoTitle: customPage.seoTitle ?? undefined,
      seoDescription: customPage.seoDescription ?? undefined,
    },
  };
}

export async function getAddablePageTemplateForSite(
  prisma: PrismaClient,
  siteId: string,
  templateKey: string
) {
  const templates = await listAddablePageTemplatesForSite(prisma, siteId);
  return templates.find((template) => template.templateKey === templateKey) ?? null;
}

export function getPageBlueprintFromManifest(
  manifest: TemplateManifest,
  blueprintKey: string
) {
  const supportedPage = manifest.supportedPages.find(
    (page) => page.pageKey === blueprintKey
  );
  if (supportedPage) {
    return {
      kind: "supported" as const,
      key: supportedPage.pageKey,
      title: supportedPage.title,
      slug: supportedPage.slug,
      allowedBlockTypes: supportedPage.allowedBlockTypes,
      defaultBlocks: supportedPage.defaultBlocks,
      seoTitle: supportedPage.seoDefaults?.seoTitle ?? null,
      seoDescription: supportedPage.seoDefaults?.seoDescription ?? null,
    };
  }

  const addablePage = manifest.addablePageTemplates?.find(
    (template) => template.templateKey === blueprintKey
  );
  if (!addablePage) {
    return null;
  }

  return {
    kind: "addable" as const,
    key: addablePage.templateKey,
    title: addablePage.defaultTitle,
    slug: null,
    allowedBlockTypes: addablePage.allowedBlockTypes,
    defaultBlocks: addablePage.defaultBlocks,
    seoTitle: addablePage.seoDefaults?.seoTitle ?? null,
    seoDescription: addablePage.seoDefaults?.seoDescription ?? null,
  };
}

export function getBlueprintStatusForPage(
  page: {
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    allowedBlockTypes: unknown;
    currentDraftRevision?: { content: unknown } | null;
    currentPublishedRevision?: { content: unknown } | null;
  },
  blueprint: NonNullable<ReturnType<typeof getPageBlueprintFromManifest>>
) {
  const content = normalizeBlockContent(
    page.currentDraftRevision?.content ?? page.currentPublishedRevision?.content
  );
  const matchesContent = equalUnknown(content, { blocks: blueprint.defaultBlocks });
  const matchesBlocks = equalUnknown(
    normalizeAllowedBlockTypes(page.allowedBlockTypes),
    blueprint.allowedBlockTypes
  );

  if (blueprint.kind === "addable") {
    return matchesBlocks && matchesContent ? "INHERITED" : "MODIFIED";
  }

  const matchesMetadata =
    page.title === blueprint.title &&
    page.slug === blueprint.slug &&
    page.seoTitle === blueprint.seoTitle &&
    page.seoDescription === blueprint.seoDescription;

  return matchesMetadata && matchesBlocks && matchesContent ? "INHERITED" : "MODIFIED";
}

export async function resolvePageLineage(
  prisma: PrismaClient,
  page: {
    sourceTemplateId: string | null;
    sourceTemplateVersionId: string | null;
    sourcePageBlueprintKey: string | null;
    sourceTemplate?: {
      id: string;
      key: string;
      name: string;
      sourceType: TemplateSourceType;
      baseTemplateKey: string | null;
      draftPresetOverrides: Prisma.JsonValue;
      draftName: string | null;
      draftCategory: string | null;
      draftDescription: string | null;
      versions?: Array<{
        id: string;
        isActive: boolean;
        manifestKey: string;
        presetOverrides: Prisma.JsonValue;
      }>;
    } | null;
    sourceTemplateVersion?: {
      id: string;
      version: string;
      isActive: boolean;
      manifestKey: string;
      presetOverrides: Prisma.JsonValue;
    } | null;
  }
) {
  if (!page.sourceTemplateId || !page.sourceTemplateVersionId || !page.sourcePageBlueprintKey) {
    return null;
  }

  const template =
    page.sourceTemplate ??
    (await prisma.template.findUnique({
      where: { id: page.sourceTemplateId },
      include: { versions: true },
    }));
  const templateVersion =
    page.sourceTemplateVersion ??
    template?.versions?.find((version) => version.id === page.sourceTemplateVersionId) ??
    null;

  if (!template || !templateVersion) {
    return null;
  }

  const manifest = getEffectiveTemplateManifest(
    {
      ...template,
      versions: [templateVersion],
    },
    { useDraft: false }
  );

  if (!manifest) {
    return null;
  }

  const blueprint = getPageBlueprintFromManifest(manifest, page.sourcePageBlueprintKey);
  if (!blueprint) {
    return null;
  }

  return {
    template,
    templateVersion,
    blueprint,
  };
}

export async function ensurePageLineageForSite(
  prisma: PrismaClient,
  siteId: string
) {
  const selection = await getSiteTemplateSelection(prisma, siteId);

  const pages = await prisma.page.findMany({
    where: { siteId },
    include: {
      currentDraftRevision: {
        select: { content: true },
      },
      currentPublishedRevision: {
        select: { content: true },
      },
      sourceTemplate: {
        include: {
          versions: true,
        },
      },
      sourceTemplateVersion: true,
    },
  });

  for (const page of pages) {
    const storedLineage =
      page.sourceTemplateId &&
      page.sourceTemplateVersionId &&
      page.sourcePageBlueprintKey
        ? await resolvePageLineage(prisma, page)
        : null;
    const blueprintKey = page.pageTemplateKey ?? page.pageKey;
    const legacyBlueprint =
      !storedLineage && selection
        ? getPageBlueprintFromManifest(selection.manifest, blueprintKey)
        : null;
    const lineage = storedLineage
      ? storedLineage
      : legacyBlueprint && selection
        ? {
            template: selection.template,
            templateVersion: selection.templateVersion,
            blueprint: legacyBlueprint,
          }
        : null;

    if (!lineage) {
      if (page.lineageStatus !== "UNTRACKED") {
        await prisma.page.update({
          where: { id: page.id },
          data: { lineageStatus: "UNTRACKED" },
        });
      }
      continue;
    }

    const computedStatus = getBlueprintStatusForPage(page, lineage.blueprint);
    const nextStatus =
      page.lineageStatus === "MODIFIED" ? "MODIFIED" : computedStatus;
    const needsBackfill =
      page.sourceTemplateId !== lineage.template.id ||
      page.sourceTemplateVersionId !== lineage.templateVersion.id ||
      page.sourcePageBlueprintKey !== lineage.blueprint.key ||
      page.lineageStatus !== nextStatus;

    if (!needsBackfill) {
      continue;
    }

    await prisma.page.update({
      where: { id: page.id },
      data: {
        sourceTemplateId: lineage.template.id,
        sourceTemplateVersionId: lineage.templateVersion.id,
        sourcePageBlueprintKey: lineage.blueprint.key,
        pageTemplateKey: page.pageTemplateKey ?? lineage.blueprint.key,
        lineageStatus: nextStatus,
      },
    });
  }
}

export function normalizePageSlug(slug: string) {
  if (slug === "/") {
    return "/";
  }

  const normalized = slug.trim().startsWith("/") ? slug.trim() : `/${slug.trim()}`;
  return normalized.replace(/\/+/g, "/").replace(/\/$/, "");
}

export function isReservedPublicPageSlug(slug: string) {
  if (reservedPublicSlugs.has(slug)) {
    return true;
  }

  return slug.startsWith("/work/") || slug.startsWith("/insights/");
}

export function buildCustomPageKeyFromSlug(slug: string) {
  const normalized = normalizePageSlug(slug);
  const trimmed = normalized === "/" ? "home" : normalized.slice(1);
  return `custom__${trimmed.replace(/\//g, "__")}`;
}

export function toPageCreationPayload(
  pageTemplate: AddablePageTemplateDefinition,
  input: {
    siteId: string;
    title: string;
    slug: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    isVisible?: boolean;
    hierarchyRole?: "MAIN" | "INNER";
    defaultParentPageKey?: string | null;
    sourceTemplateId?: string | null;
    sourceTemplateVersionId?: string | null;
  }
) {
  const hierarchyRole = input.hierarchyRole ?? "MAIN";

  return {
    siteId: input.siteId,
    pageKey: buildCustomPageKeyFromSlug(input.slug),
    pageTemplateKey: pageTemplate.templateKey,
    sourceTemplateId: input.sourceTemplateId ?? null,
    sourceTemplateVersionId: input.sourceTemplateVersionId ?? null,
    sourcePageBlueprintKey: pageTemplate.templateKey,
    lineageStatus: input.sourceTemplateId && input.sourceTemplateVersionId
      ? ("INHERITED" as const)
      : ("UNTRACKED" as const),
    allowedBlockTypes: toJsonInput(pageTemplate.allowedBlockTypes),
    slug: normalizePageSlug(input.slug),
    title: input.title,
    status: "DRAFT" as const,
    isVisible: input.isVisible ?? true,
    hierarchyRole,
    defaultParentPageKey:
      hierarchyRole === "INNER" ? input.defaultParentPageKey ?? null : null,
    seoTitle: input.seoTitle ?? pageTemplate.seoDefaults?.seoTitle ?? input.title,
    seoDescription:
      input.seoDescription ?? pageTemplate.seoDefaults?.seoDescription ?? null,
  };
}

export async function ensureStarterPagesForSite(
  prisma: PrismaClient,
  options: {
    siteId: string;
    adminId?: string | null;
  }
) {
  const selection = await getSiteTemplateSelection(prisma, options.siteId);
  const supportedPages =
    selection?.manifest.supportedPages ?? (await listSupportedPagesForSite(prisma, options.siteId));

  for (const pageDef of supportedPages) {
    const existing = await prisma.page.findUnique({
      where: {
        siteId_pageKey: {
          siteId: options.siteId,
          pageKey: pageDef.pageKey,
        },
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const page = await prisma.page.create({
      data: {
        siteId: options.siteId,
        pageKey: pageDef.pageKey,
        pageTemplateKey: pageDef.pageKey,
        sourceTemplateId: selection?.template.id ?? null,
        sourceTemplateVersionId: selection?.templateVersion.id ?? null,
        sourcePageBlueprintKey: pageDef.pageKey,
        lineageStatus: selection ? "INHERITED" : "UNTRACKED",
        allowedBlockTypes: toJsonInput(pageDef.allowedBlockTypes),
        slug: pageDef.slug,
        title: pageDef.title,
        status: "DRAFT",
        seoTitle: pageDef.seoDefaults?.seoTitle ?? null,
        seoDescription: pageDef.seoDefaults?.seoDescription ?? null,
      },
    });

    const revision = await prisma.pageRevision.create({
      data: {
        pageId: page.id,
        revisionNumber: 1,
        state: "DRAFT",
        content: toJsonInput({ blocks: pageDef.defaultBlocks }),
        schemaVersion: 1,
        checksum: checksumForContent({ blocks: pageDef.defaultBlocks }),
        createdBy: options.adminId ?? null,
      },
    });

    await prisma.page.update({
      where: { id: page.id },
      data: {
        currentDraftRevisionId: revision.id,
      },
    });
  }
}
