import type { CmsStatus, PrismaClient } from "@prisma/client";

export const BLOCK_EDITOR_KIND = "BLOCK" as const;
export const LEGACY_EDITOR_KIND = "LEGACY" as const;

export const PAGE_EDITOR_CONTENT_MODE = {
  MODERN_ONLY: "MODERN_ONLY",
  LEGACY_ONLY: "LEGACY_ONLY",
  MIXED: "MIXED",
  EMPTY: "EMPTY",
} as const;

export const PAGE_EDITOR_COMPATIBILITY_REASON = {
  MODERN_PAGE_AVAILABLE: "MODERN_PAGE_AVAILABLE",
  LEGACY_ONLY_CONTENT: "LEGACY_ONLY_CONTENT",
  MODERN_AND_LEGACY_COEXIST: "MODERN_AND_LEGACY_COEXIST",
  NO_CONTENT: "NO_CONTENT",
} as const;

export const PAGE_COMPATIBILITY_STATUS = {
  NONE: "NONE",
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
} as const;

export const CANONICAL_LEGACY_HOME_EDITOR_ROUTE = "/admin/legacy/home";
export const LEGACY_HOME_EDITOR_ALIAS_ROUTE = "/admin/pages/home/legacy";

const LEGACY_HOME_SECTION_KEYS = [
  "hero",
  "services",
  "featuredWork",
  "faq",
  "cta",
  "testimonials",
  "awards",
] as const;

export type PageCompatibilityStatus =
  (typeof PAGE_COMPATIBILITY_STATUS)[keyof typeof PAGE_COMPATIBILITY_STATUS];

export type PageEditorContentMode =
  (typeof PAGE_EDITOR_CONTENT_MODE)[keyof typeof PAGE_EDITOR_CONTENT_MODE];

export type PageEditorCompatibilityReason =
  (typeof PAGE_EDITOR_COMPATIBILITY_REASON)[keyof typeof PAGE_EDITOR_COMPATIBILITY_REASON];

export type PageEditorResolution = {
  hasModernPage: boolean;
  hasModernDraft: boolean;
  hasModernPublishedRevision: boolean;
  hasLegacyCmsContent: boolean;
  hasPublishedLegacyContent: boolean;
  preferredEditor: typeof BLOCK_EDITOR_KIND | typeof LEGACY_EDITOR_KIND;
  editorRoute: string;
  legacyEditorRoute: string | null;
  contentMode: PageEditorContentMode;
  compatibilityReason: PageEditorCompatibilityReason;
  migrationAvailable: boolean;
};

type ResolvePageEditorStateInput = {
  prisma: PrismaClient;
  siteId: string;
  tenantId?: string | null;
  pageKey: string;
  page?: {
    id: string;
    siteId: string;
    pageKey: string;
    pageTemplateKey: string | null;
    status: "DRAFT" | "PUBLISHED";
    slug: string;
    title: string;
    lineageStatus?: "UNTRACKED" | "INHERITED" | "MODIFIED";
    currentDraftRevision?: {
      revisionNumber: number;
      content: unknown;
    } | null;
    currentPublishedRevision?: {
      revisionNumber: number;
      content: unknown;
    } | null;
    sourceTemplate?: {
      sourceType: "STARTER" | "CUSTOM";
    } | null;
  } | null;
  pageDefinition?: {
    defaultBlocks?: unknown[];
  } | null;
  legacyHomeSections?: LegacyHomeSectionRecord[] | null;
};

type LegacyHomeSectionRecord = {
  section: string;
  status: CmsStatus;
  publishedAt: Date | null;
  draftData: unknown;
  publishedData: unknown;
};

type LegacyHomeCompatibility = {
  hasLegacyCmsContent: boolean;
  hasPublishedLegacyContent: boolean;
  status: PageCompatibilityStatus;
  publishedAt: Date | null;
};

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

function isMeaningfulJsonValue(value: unknown): boolean {
  if (value == null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => isMeaningfulJsonValue(entry));
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      isMeaningfulJsonValue(entry)
    );
  }

  return false;
}

function normalizeBlocksFromContent(content: unknown) {
  const blocks =
    content && typeof content === "object" && !Array.isArray(content)
      ? (content as { blocks?: unknown }).blocks
      : null;

  return Array.isArray(blocks) ? blocks : [];
}

function getBlockEditorRoute(pageKey: string) {
  return `/admin/pages/${encodeURIComponent(pageKey)}`;
}

async function assertSiteTenantScope(
  prisma: PrismaClient,
  siteId: string,
  tenantId?: string | null
) {
  if (!tenantId) {
    return;
  }

  const site = await prisma.site.findFirst({
    where: {
      id: siteId,
      tenantId,
    },
    select: { id: true },
  });

  if (!site) {
    throw new Error("Requested page is outside the active tenant scope.");
  }
}

function getLegacyHomeCompatibility(
  sections: LegacyHomeSectionRecord[] | null | undefined
): LegacyHomeCompatibility {
  if (!sections || sections.length === 0) {
    return {
      hasLegacyCmsContent: false,
      hasPublishedLegacyContent: false,
      status: PAGE_COMPATIBILITY_STATUS.NONE,
      publishedAt: null,
    };
  }

  const relevantSections = sections.filter(
    (section) =>
      LEGACY_HOME_SECTION_KEYS.includes(section.section as (typeof LEGACY_HOME_SECTION_KEYS)[number]) &&
      (isMeaningfulJsonValue(section.draftData) ||
        isMeaningfulJsonValue(section.publishedData) ||
        section.status === "PUBLISHED")
  );

  if (relevantSections.length === 0) {
    return {
      hasLegacyCmsContent: false,
      hasPublishedLegacyContent: false,
      status: PAGE_COMPATIBILITY_STATUS.NONE,
      publishedAt: null,
    };
  }

  const sectionsByKey = new Map(
    relevantSections.map((section) => [section.section, section])
  );
  const allPublished = LEGACY_HOME_SECTION_KEYS.every(
    (sectionKey) => sectionsByKey.get(sectionKey)?.status === "PUBLISHED"
  );

  return {
    hasLegacyCmsContent: true,
    hasPublishedLegacyContent: allPublished,
    status: allPublished
      ? PAGE_COMPATIBILITY_STATUS.PUBLISHED
      : PAGE_COMPATIBILITY_STATUS.DRAFT,
    publishedAt: allPublished
      ? relevantSections.reduce<Date | null>((latest, section) => {
          if (!section.publishedAt) {
            return latest;
          }
          if (!latest || section.publishedAt.getTime() > latest.getTime()) {
            return section.publishedAt;
          }
          return latest;
        }, null)
      : null,
  };
}

function hasMeaningfulModernContent(
  page: NonNullable<ResolvePageEditorStateInput["page"]>,
  pageDefinition?: ResolvePageEditorStateInput["pageDefinition"]
) {
  if (page.currentPublishedRevision) {
    return true;
  }

  if (!page.currentDraftRevision) {
    return false;
  }

  const draftBlocks = normalizeBlocksFromContent(page.currentDraftRevision.content);
  if (draftBlocks.length === 0) {
    return false;
  }

  const sourceType = page.sourceTemplate?.sourceType ?? null;
  if (sourceType === "CUSTOM") {
    return true;
  }

  if (page.currentDraftRevision.revisionNumber > 1) {
    return true;
  }

  if ((page.lineageStatus ?? "UNTRACKED") !== "INHERITED") {
    return true;
  }

  if (!pageDefinition) {
    return true;
  }

  return (
    stableStringify({ blocks: draftBlocks }) !==
    stableStringify({ blocks: pageDefinition.defaultBlocks })
  );
}

async function getLegacyHomeSections(
  prisma: PrismaClient,
  siteId: string
): Promise<LegacyHomeSectionRecord[]> {
  const cmsSectionModel = (prisma as PrismaClient & {
    cmsSection?: {
      findMany?: (args: {
        where: {
          siteId: string;
          page: string;
          section: { in: string[] };
        };
        select: {
          section: true;
          status: true;
          publishedAt: true;
          draftData: true;
          publishedData: true;
        };
      }) => Promise<LegacyHomeSectionRecord[]>;
    };
  }).cmsSection;

  if (typeof cmsSectionModel?.findMany !== "function") {
    return [];
  }

  return cmsSectionModel.findMany({
    where: {
      siteId,
      page: "home",
      section: { in: [...LEGACY_HOME_SECTION_KEYS] },
    },
    select: {
      section: true,
      status: true,
      publishedAt: true,
      draftData: true,
      publishedData: true,
    },
  });
}

async function getScopedPage(
  prisma: PrismaClient,
  siteId: string,
  pageKey: string
): Promise<ResolvePageEditorStateInput["page"]> {
  return prisma.page.findUnique({
    where: {
      siteId_pageKey: {
        siteId,
        pageKey,
      },
    },
    include: {
      currentDraftRevision: {
        select: {
          revisionNumber: true,
          content: true,
        },
      },
      currentPublishedRevision: {
        select: {
          revisionNumber: true,
          content: true,
        },
      },
      sourceTemplate: {
        select: {
          sourceType: true,
        },
      },
    },
  });
}

export async function resolvePageEditorState(
  input: ResolvePageEditorStateInput
): Promise<PageEditorResolution> {
  await assertSiteTenantScope(input.prisma, input.siteId, input.tenantId);

  const page =
    input.page !== undefined
      ? input.page
      : await getScopedPage(input.prisma, input.siteId, input.pageKey);

  const legacyCompatibility =
    input.pageKey === "home"
      ? getLegacyHomeCompatibility(
          input.legacyHomeSections ?? (await getLegacyHomeSections(input.prisma, input.siteId))
        )
      : {
          hasLegacyCmsContent: false,
          hasPublishedLegacyContent: false,
          status: PAGE_COMPATIBILITY_STATUS.NONE as PageCompatibilityStatus,
        };

  const hasModernPage = Boolean(page);
  const hasModernDraft = Boolean(page?.currentDraftRevision);
  const hasModernPublishedRevision = Boolean(page?.currentPublishedRevision);
  const meaningfulModernContent = page
    ? hasMeaningfulModernContent(page, input.pageDefinition)
    : false;

  if (legacyCompatibility.hasLegacyCmsContent && !meaningfulModernContent) {
    return {
      hasModernPage,
      hasModernDraft,
      hasModernPublishedRevision,
      hasLegacyCmsContent: true,
      hasPublishedLegacyContent: legacyCompatibility.hasPublishedLegacyContent,
      preferredEditor: LEGACY_EDITOR_KIND,
      editorRoute: CANONICAL_LEGACY_HOME_EDITOR_ROUTE,
      legacyEditorRoute: CANONICAL_LEGACY_HOME_EDITOR_ROUTE,
      contentMode: PAGE_EDITOR_CONTENT_MODE.LEGACY_ONLY,
      compatibilityReason: PAGE_EDITOR_COMPATIBILITY_REASON.LEGACY_ONLY_CONTENT,
      migrationAvailable: true,
    };
  }

  if (legacyCompatibility.hasLegacyCmsContent && meaningfulModernContent) {
    return {
      hasModernPage,
      hasModernDraft,
      hasModernPublishedRevision,
      hasLegacyCmsContent: true,
      hasPublishedLegacyContent: legacyCompatibility.hasPublishedLegacyContent,
      preferredEditor: BLOCK_EDITOR_KIND,
      editorRoute: getBlockEditorRoute(input.pageKey),
      legacyEditorRoute: CANONICAL_LEGACY_HOME_EDITOR_ROUTE,
      contentMode: PAGE_EDITOR_CONTENT_MODE.MIXED,
      compatibilityReason: PAGE_EDITOR_COMPATIBILITY_REASON.MODERN_AND_LEGACY_COEXIST,
      migrationAvailable: true,
    };
  }

  if (hasModernPage) {
    return {
      hasModernPage,
      hasModernDraft,
      hasModernPublishedRevision,
      hasLegacyCmsContent: false,
      hasPublishedLegacyContent: false,
      preferredEditor: BLOCK_EDITOR_KIND,
      editorRoute: getBlockEditorRoute(input.pageKey),
      legacyEditorRoute: null,
      contentMode: PAGE_EDITOR_CONTENT_MODE.MODERN_ONLY,
      compatibilityReason: PAGE_EDITOR_COMPATIBILITY_REASON.MODERN_PAGE_AVAILABLE,
      migrationAvailable: false,
    };
  }

  return {
    hasModernPage: false,
    hasModernDraft: false,
    hasModernPublishedRevision: false,
    hasLegacyCmsContent: false,
    hasPublishedLegacyContent: false,
    preferredEditor: BLOCK_EDITOR_KIND,
    editorRoute: getBlockEditorRoute(input.pageKey),
    legacyEditorRoute: null,
    contentMode: PAGE_EDITOR_CONTENT_MODE.EMPTY,
    compatibilityReason: PAGE_EDITOR_COMPATIBILITY_REASON.NO_CONTENT,
    migrationAvailable: false,
  };
}

export async function getLegacyPageCompatibilityStatus(
  prisma: PrismaClient,
  options: { siteId: string; pageKey: string }
) {
  return (await getLegacyPageCompatibilityDetails(prisma, options)).status;
}

export async function getLegacyPageCompatibilityDetails(
  prisma: PrismaClient,
  options: { siteId: string; pageKey: string }
) {
  if (options.pageKey !== "home") {
    return {
      hasLegacyCmsContent: false,
      hasPublishedLegacyContent: false,
      status: PAGE_COMPATIBILITY_STATUS.NONE as PageCompatibilityStatus,
      publishedAt: null,
    };
  }

  const sections = await getLegacyHomeSections(prisma, options.siteId);
  return getLegacyHomeCompatibility(sections);
}
