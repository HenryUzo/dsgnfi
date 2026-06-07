import { Prisma } from "@prisma/client";
import type { PrismaClient, Template, TemplateVersion } from "@prisma/client";

import { buildStarterSupportedPages } from "../templates/pageDefaults";
import { getTemplateManifest, listTemplateManifests } from "../templates/registry";
import type {
  PageBlockInput,
  PageKey,
  StarterSiteSettings,
  TemplateManifest,
  TemplatePresetOverrides,
} from "../templates/types";
import { ApiRequestError } from "./apiErrors";
import { writeAuditLog } from "./auditLog";
import {
  mergeTemplateManifest,
  normalizeTemplateNavigationObjects,
  toPageOverrideFromSnapshot,
  validateTemplatePresetOverrides,
} from "./templatePresets";
import { buildNavigationDefaults, normalizeNavigationItems } from "./sitePresentation";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

type TemplateRecord = Prisma.TemplateGetPayload<{
  include: {
    versions: true;
    tenant: {
      select: {
        id: true;
        slug: true;
        name: true;
      };
    };
  };
}>;

function toJsonInput(value: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;
  return value as Prisma.InputJsonObject;
}

function parsePresetOverrides(value: unknown): TemplatePresetOverrides | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as TemplatePresetOverrides;
}

function slugifyTemplateKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function bumpPatchVersion(version: string | null | undefined) {
  if (!version) {
    return "1.0.0";
  }

  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    return "1.0.0";
  }

  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

function toTemplateSummary(record: TemplateRecord) {
  const activeVersion = record.versions
    .filter((version) => version.isActive)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
  const manifest = getEffectiveTemplateManifest(record, {
    useDraft: record.sourceType === "CUSTOM",
  });
  const homePage = manifest?.supportedPages.find((page) => page.pageKey === "home");
  const heroBlock = homePage?.defaultBlocks.find((block) => block.type === "hero");
  const heroData =
    heroBlock?.data && typeof heroBlock.data === "object"
      ? (heroBlock.data as { headline?: unknown; subheadline?: unknown })
      : null;

  return {
    id: record.id,
    key: record.key,
    name: record.draftName ?? record.name,
    category: record.draftCategory ?? record.category,
    description: record.draftDescription ?? record.description,
    status: record.status,
    sourceType: record.sourceType,
    baseTemplateKey: record.baseTemplateKey ?? null,
    isActive: record.status === "ACTIVE" && Boolean(activeVersion),
    createdBy: record.createdBy ?? null,
    activeVersion: activeVersion
      ? {
          id: activeVersion.id,
          version: activeVersion.version,
          manifestKey: activeVersion.manifestKey,
        }
      : null,
    usageCount: 0,
    lastPublishedAt: activeVersion?.createdAt ?? null,
    manifest: manifest
      ? {
          starterNavigation: manifest.starterNavigation,
          starterContentHints: manifest.starterContentHints,
          editableFieldGroups: manifest.editableFieldGroups,
          homePreview: {
            title:
              typeof heroData?.headline === "string"
                ? heroData.headline
                : manifest.name,
            subtitle:
              typeof heroData?.subheadline === "string"
                ? heroData.subheadline
                : manifest.description,
            sections:
              homePage?.defaultBlocks.map((block) => block.type) ??
              manifest.starterContentHints.homeSections,
          },
        }
      : null,
  };
}

export function getEffectiveTemplateManifest(
  template:
    | (Pick<
        Template,
        | "key"
        | "sourceType"
        | "baseTemplateKey"
        | "draftPresetOverrides"
        | "draftName"
        | "draftCategory"
        | "draftDescription"
      > & {
        versions?: Pick<TemplateVersion, "isActive" | "manifestKey" | "presetOverrides">[];
      })
    | null,
  options?: { useDraft?: boolean }
): TemplateManifest | null {
  if (!template) {
    return null;
  }

  if (template.sourceType === "STARTER") {
    return getTemplateManifest(template.key);
  }

  const baseManifest = template.baseTemplateKey
    ? getTemplateManifest(template.baseTemplateKey)
    : null;

  if (!baseManifest) {
    return null;
  }

  const activeVersion = template.versions?.find((version) => version.isActive) ?? null;
  const overrides = options?.useDraft
    ? parsePresetOverrides(template.draftPresetOverrides) ??
      parsePresetOverrides(activeVersion?.presetOverrides)
    : parsePresetOverrides(activeVersion?.presetOverrides);

  return mergeTemplateManifest(baseManifest, overrides);
}

export async function ensureTemplateCatalog(prisma: PrismaLike) {
  const manifests = listTemplateManifests();

  for (const manifest of manifests) {
    const template = await prisma.template.upsert({
      where: { key: manifest.key },
      update: {
        name: manifest.name,
        category: manifest.category,
        description: manifest.description,
        status: "ACTIVE",
        sourceType: "STARTER",
        tenantId: null,
        baseTemplateKey: null,
        draftName: null,
        draftCategory: null,
        draftDescription: null,
        draftPresetOverrides: Prisma.DbNull,
      },
      create: {
        key: manifest.key,
        name: manifest.name,
        category: manifest.category,
        description: manifest.description,
        status: "ACTIVE",
        sourceType: "STARTER",
      },
    });

    await prisma.templateVersion.updateMany({
      where: {
        templateId: template.id,
        version: { not: manifest.version },
      },
      data: { isActive: false },
    });

    await prisma.templateVersion.upsert({
      where: {
        templateId_version: {
          templateId: template.id,
          version: manifest.version,
        },
      },
      update: {
        manifestKey: manifest.key,
        isActive: true,
        presetOverrides: Prisma.DbNull,
      },
      create: {
        templateId: template.id,
        version: manifest.version,
        manifestKey: manifest.key,
        isActive: true,
        presetOverrides: Prisma.DbNull,
      },
    });
  }
}

export async function listAdminTemplates(
  prisma: PrismaLike,
  options: {
    tenantId: string;
    category?: string | null;
    scope?: "all" | "starter" | "custom";
  }
) {
  await ensureTemplateCatalog(prisma);

  const templates = await prisma.template.findMany({
    where: {
      status: { not: "INACTIVE" },
      ...(options.category ? { category: options.category } : {}),
      ...(options.scope === "starter"
        ? { sourceType: "STARTER" }
        : options.scope === "custom"
          ? { sourceType: "CUSTOM", tenantId: options.tenantId }
          : {
              OR: [{ sourceType: "STARTER" }, { sourceType: "CUSTOM", tenantId: options.tenantId }],
            }),
    },
    include: {
      versions: true,
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
    orderBy: [{ sourceType: "asc" }, { category: "asc" }, { name: "asc" }],
  });

  const usageRows = await prisma.site.groupBy({
    by: ["templateId"],
    where: {
      templateId: {
        in: templates.map((template) => template.id),
      },
    },
    _count: {
      templateId: true,
    },
  });

  const usageMap = new Map(
    usageRows.map((row) => [row.templateId, row._count.templateId])
  );

  return templates.map((template) => ({
    ...toTemplateSummary(template),
    usageCount: usageMap.get(template.id) ?? 0,
  }));
}

export async function getTemplateDetail(
  prisma: PrismaLike,
  options: { tenantId: string; templateKey: string }
) {
  await ensureTemplateCatalog(prisma);

  const template = await prisma.template.findUnique({
    where: { key: options.templateKey },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
      },
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!template || template.status === "INACTIVE") {
    return null;
  }

  if (template.sourceType === "CUSTOM" && template.tenantId !== options.tenantId) {
    return null;
  }

  const summary = toTemplateSummary(template);
  const activeVersion = template.versions.find((version) => version.isActive) ?? null;
  const manifest = getEffectiveTemplateManifest(template, {
    useDraft: template.sourceType === "CUSTOM",
  });

  return {
    ...summary,
    activeVersion: activeVersion
      ? {
          id: activeVersion.id,
          version: activeVersion.version,
          manifestKey: activeVersion.manifestKey,
        }
      : null,
    manifest,
    publishedManifest: getEffectiveTemplateManifest(template, { useDraft: false }),
  };
}

export async function resolveTemplateSelection(
  prisma: PrismaLike,
  options: {
    tenantId: string;
    templateKey?: string | null;
    templateVersion?: string | null;
  }
) {
  if (!options.templateKey) {
    return null;
  }

  await ensureTemplateCatalog(prisma);

  const template = await prisma.template.findUnique({
    where: { key: options.templateKey },
    include: { versions: true },
  });

  if (!template || template.status !== "ACTIVE") {
    return null;
  }

  if (template.sourceType === "CUSTOM" && template.tenantId !== options.tenantId) {
    return null;
  }

  const version =
    template.versions.find((entry) =>
      options.templateVersion ? entry.version === options.templateVersion : entry.isActive
    ) ?? null;

  if (!version || !version.isActive) {
    return null;
  }

  const manifest = getEffectiveTemplateManifest(
    {
      ...template,
      versions: [version],
    },
    { useDraft: false }
  );

  if (!manifest) {
    return null;
  }

  return {
    template,
    version,
    manifest,
  };
}

function buildSiteSnapshotOverrides(site: {
  name: string;
  settings: {
    logoUrl: string | null;
    faviconUrl: string | null;
    tagline: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    address: string | null;
    socialLinks: unknown;
    seoTitle: string | null;
    seoDescription: string | null;
    theme: unknown;
    locale: string | null;
    timezone: string | null;
    primaryNavigation: unknown;
    footerNavigation: unknown;
  } | null;
  pages: Array<{
    pageKey: string;
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    currentDraftRevision: { content: unknown } | null;
    currentPublishedRevision: { content: unknown } | null;
  }>;
}) {
  const pageKeys = new Set(site.pages.map((page) => page.pageKey));
  const blocksForPage = (content: unknown) => {
    const normalized =
      content && typeof content === "object" && !Array.isArray(content)
        ? ((content as { blocks?: unknown[] }).blocks ?? [])
        : [];

    return normalized as PageBlockInput[];
  };

  return {
    starterSiteSettings: {
      tagline: site.settings?.tagline ?? null,
      contactEmail: site.settings?.contactEmail ?? null,
      contactPhone: site.settings?.contactPhone ?? null,
      address: site.settings?.address ?? null,
      socialLinks:
        (site.settings?.socialLinks as Record<string, string> | null) ?? null,
      seoTitle: site.settings?.seoTitle ?? site.name,
      seoDescription: site.settings?.seoDescription ?? null,
      theme: (site.settings?.theme as Record<string, unknown> | null) ?? null,
      locale: site.settings?.locale ?? null,
      timezone: site.settings?.timezone ?? null,
      logoUrl: site.settings?.logoUrl ?? null,
      faviconUrl: site.settings?.faviconUrl ?? null,
    },
    starterNavigation: {
      primary: normalizeNavigationItems(
        Array.isArray(site.settings?.primaryNavigation)
          ? (site.settings?.primaryNavigation as Array<{
              id: string;
              label: string;
              pageKey?: string | null;
              href?: string | null;
              visible?: boolean | null;
              order?: number | null;
            }>)
          : []
      ).map((item) => ({
        label: item.label,
        pageKey: (item.pageKey as PageKey | null) ?? null,
        href: item.href,
        visible: item.visible,
      })),
      footer: normalizeNavigationItems(
        Array.isArray(site.settings?.footerNavigation)
          ? (site.settings?.footerNavigation as Array<{
              id: string;
              label: string;
              pageKey?: string | null;
              href?: string | null;
              visible?: boolean | null;
              order?: number | null;
            }>)
          : []
      ).map((item) => ({
        label: item.label,
        pageKey: (item.pageKey as PageKey | null) ?? null,
        href: item.href,
        visible: item.visible,
      })),
    },
    starterContentHints: {
      homeSections: ["hero", "services", "featuredWork", "faq", "cta"],
      processEnabled: pageKeys.has("process"),
      workEnabled: pageKeys.has("work"),
    },
    supportedPages: site.pages
      .map((page) =>
        toPageOverrideFromSnapshot({
          pageKey: page.pageKey as PageKey,
          title: page.title,
          slug: page.slug,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          blocks: blocksForPage(
            page.currentDraftRevision?.content ?? page.currentPublishedRevision?.content
          ),
        })
      ),
  } satisfies TemplatePresetOverrides;
}

export async function createCustomTemplate(
  prisma: PrismaLike,
  options: {
    tenantId: string;
    adminId: string;
    name: string;
    description: string;
    category: string;
    sourceTemplateKey?: string | null;
    sourceSiteId?: string | null;
  }
) {
  await ensureTemplateCatalog(prisma);

  const baseStarter = options.sourceTemplateKey
    ? await prisma.template.findUnique({
        where: { key: options.sourceTemplateKey },
        include: { versions: true },
      })
    : null;

  let baseTemplateKey =
    baseStarter?.sourceType === "STARTER"
      ? baseStarter.key
      : baseStarter?.baseTemplateKey ?? null;
  let draftOverrides: TemplatePresetOverrides = {};

  if (options.sourceSiteId) {
    const sourceSite = await prisma.site.findFirst({
      where: {
        id: options.sourceSiteId,
        tenantId: options.tenantId,
      },
      include: {
        template: true,
        settings: true,
        pages: {
          include: {
            currentDraftRevision: {
              select: { content: true },
            },
            currentPublishedRevision: {
              select: { content: true },
            },
          },
        },
      },
    });

    if (!sourceSite) {
      throw new ApiRequestError(404, "site_not_found", "Source site not found.");
    }

    baseTemplateKey =
      sourceSite.template?.sourceType === "STARTER"
        ? sourceSite.template.key
        : sourceSite.template?.baseTemplateKey ?? baseTemplateKey;

    if (!baseTemplateKey) {
      throw new ApiRequestError(
        400,
        "template_source_invalid",
        "Source site does not have a valid starter template lineage."
      );
    }

    draftOverrides = buildSiteSnapshotOverrides(sourceSite);
  }

  if (!baseTemplateKey) {
    throw new ApiRequestError(
      400,
      "template_source_invalid",
      "Choose a starter template or an existing site to create a custom template."
    );
  }

  const baseManifest = getTemplateManifest(baseTemplateKey);
  if (!baseManifest) {
    throw new ApiRequestError(
      400,
      "template_base_invalid",
      "Base starter template could not be resolved."
    );
  }

  const validation = validateTemplatePresetOverrides(baseManifest, draftOverrides);
  if (!validation.success) {
    throw new ApiRequestError(400, "template_validation_failed", "Invalid template preset defaults.", {
      overrides: validation.error.issues.map((issue) => issue.message),
    });
  }

  const uniqueSeed = slugifyTemplateKey(options.name) || "custom-template";
  const key = `${baseTemplateKey}--${uniqueSeed}--${Date.now().toString(36)}`;

  const template = await prisma.template.create({
    data: {
      tenantId: options.tenantId,
      key,
      sourceType: "CUSTOM",
      baseTemplateKey,
      name: options.name,
      category: options.category,
      description: options.description,
      createdBy: options.adminId,
      draftName: options.name,
      draftCategory: options.category,
      draftDescription: options.description,
      draftPresetOverrides: validation.data as Prisma.InputJsonValue,
      status: "ACTIVE",
    },
    include: {
      versions: true,
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  await writeAuditLog(prisma as PrismaClient, {
    actorAdminUserId: options.adminId,
    action: "template.created",
    entityType: "template",
    entityId: template.id,
    metadata: {
      key: template.key,
      sourceType: template.sourceType,
      baseTemplateKey,
    },
  });

  return getTemplateDetail(prisma, {
    tenantId: options.tenantId,
    templateKey: template.key,
  });
}

export async function updateCustomTemplate(
  prisma: PrismaLike,
  options: {
    tenantId: string;
    templateId: string;
    adminId: string;
    name: string;
    description: string;
    category: string;
    presetOverrides: unknown;
  }
) {
  const template = await prisma.template.findFirst({
    where: {
      id: options.templateId,
      tenantId: options.tenantId,
      sourceType: "CUSTOM",
    },
    include: {
      versions: true,
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!template) {
    throw new ApiRequestError(404, "template_not_found", "Template not found.");
  }

  const baseManifest = template.baseTemplateKey
    ? getTemplateManifest(template.baseTemplateKey)
    : null;

  if (!baseManifest) {
    throw new ApiRequestError(400, "template_base_invalid", "Base template is invalid.");
  }

  const validation = validateTemplatePresetOverrides(baseManifest, options.presetOverrides);
  if (!validation.success) {
    throw new ApiRequestError(
      400,
      "template_validation_failed",
      "Invalid template preset defaults.",
      {
        overrides: validation.error.issues.map((issue) => issue.message),
      }
    );
  }

  await prisma.template.update({
    where: { id: template.id },
    data: {
      draftName: options.name,
      draftDescription: options.description,
      draftCategory: options.category,
      draftPresetOverrides: validation.data as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog(prisma as PrismaClient, {
    actorAdminUserId: options.adminId,
    action: "template.updated",
    entityType: "template",
    entityId: template.id,
    metadata: {
      name: options.name,
      category: options.category,
    },
  });

  return getTemplateDetail(prisma, {
    tenantId: options.tenantId,
    templateKey: template.key,
  });
}

export async function publishCustomTemplate(
  prisma: PrismaLike,
  options: {
    tenantId: string;
    templateId: string;
    adminId: string;
  }
) {
  const template = await prisma.template.findFirst({
    where: {
      id: options.templateId,
      tenantId: options.tenantId,
      sourceType: "CUSTOM",
    },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
      },
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!template) {
    throw new ApiRequestError(404, "template_not_found", "Template not found.");
  }

  const baseManifest = template.baseTemplateKey
    ? getTemplateManifest(template.baseTemplateKey)
    : null;
  if (!baseManifest) {
    throw new ApiRequestError(400, "template_base_invalid", "Base template is invalid.");
  }

  const validation = validateTemplatePresetOverrides(
    baseManifest,
    parsePresetOverrides(template.draftPresetOverrides) ?? {}
  );
  if (!validation.success) {
    throw new ApiRequestError(
      400,
      "template_validation_failed",
      "Invalid template preset defaults.",
      {
        overrides: validation.error.issues.map((issue) => issue.message),
      }
    );
  }

  const activeVersion = template.versions.find((version) => version.isActive) ?? null;
  const nextVersion = bumpPatchVersion(activeVersion?.version);

  await prisma.templateVersion.updateMany({
    where: {
      templateId: template.id,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  await prisma.templateVersion.create({
    data: {
      templateId: template.id,
      version: nextVersion,
      manifestKey: template.baseTemplateKey ?? template.key,
      isActive: true,
      presetOverrides: validation.data as Prisma.InputJsonValue,
    },
  });

  await prisma.template.update({
    where: { id: template.id },
    data: {
      name: template.draftName ?? template.name,
      category: template.draftCategory ?? template.category,
      description: template.draftDescription ?? template.description,
    },
  });

  await writeAuditLog(prisma as PrismaClient, {
    actorAdminUserId: options.adminId,
    action: "template.published",
    entityType: "template",
    entityId: template.id,
    metadata: {
      version: nextVersion,
      key: template.key,
    },
  });

  return getTemplateDetail(prisma, {
    tenantId: options.tenantId,
    templateKey: template.key,
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function equalUnknown(a: unknown, b: unknown) {
  return stableStringify(a) === stableStringify(b);
}

function computeSiteDrift(options: {
  effectiveManifest: TemplateManifest | null;
  site: {
    settings: {
      tagline: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      address: string | null;
      socialLinks: unknown;
      seoTitle: string | null;
      seoDescription: string | null;
      theme: unknown;
      locale: string | null;
      timezone: string | null;
      logoUrl: string | null;
      faviconUrl: string | null;
      primaryNavigation: unknown;
      footerNavigation: unknown;
    } | null;
    pages: Array<{
      pageKey: string;
      title: string;
      slug: string;
      seoTitle: string | null;
      seoDescription: string | null;
      currentDraftRevision: { content: unknown } | null;
      currentPublishedRevision: { content: unknown } | null;
    }>;
  };
}) {
  if (!options.effectiveManifest || !options.site.settings) {
    return false;
  }

  const expectedSettings = options.effectiveManifest.starterSiteSettings;
  const settings = options.site.settings;

  const matchesSettings =
    settings.tagline === (expectedSettings.tagline ?? null) &&
    settings.contactEmail === (expectedSettings.contactEmail ?? null) &&
    settings.contactPhone === (expectedSettings.contactPhone ?? null) &&
    settings.address === (expectedSettings.address ?? null) &&
    settings.seoTitle === (expectedSettings.seoTitle ?? null) &&
    settings.seoDescription === (expectedSettings.seoDescription ?? null) &&
    settings.locale === (expectedSettings.locale ?? null) &&
    settings.timezone === (expectedSettings.timezone ?? null) &&
    settings.logoUrl === (expectedSettings.logoUrl ?? null) &&
    settings.faviconUrl === (expectedSettings.faviconUrl ?? null) &&
    equalUnknown(settings.socialLinks ?? null, expectedSettings.socialLinks ?? null) &&
    equalUnknown(settings.theme ?? {}, expectedSettings.theme ?? {});

  const expectedNavigation = buildNavigationDefaults({
    starterPrimary: options.effectiveManifest.starterNavigation.primary,
    starterFooter: options.effectiveManifest.starterNavigation.footer,
    supportedPages: options.effectiveManifest.supportedPages,
  });

  const matchesNavigation =
    equalUnknown(settings.primaryNavigation ?? [], expectedNavigation.primaryNavigation) &&
    equalUnknown(settings.footerNavigation ?? [], expectedNavigation.footerNavigation);

  const pageMap = new Map(options.site.pages.map((page) => [page.pageKey, page]));
  const matchesPages = options.effectiveManifest.supportedPages.every((pageDef) => {
    const page = pageMap.get(pageDef.pageKey);
    if (!page) {
      return false;
    }

    const content = page.currentDraftRevision?.content ?? page.currentPublishedRevision?.content;
    return (
      page.title === pageDef.title &&
      page.slug === pageDef.slug &&
      page.seoTitle === (pageDef.seoDefaults?.seoTitle ?? null) &&
      page.seoDescription === (pageDef.seoDefaults?.seoDescription ?? null) &&
      equalUnknown(content ?? { blocks: [] }, { blocks: pageDef.defaultBlocks })
    );
  });

  return !(matchesSettings && matchesNavigation && matchesPages);
}

export async function listTemplateUsages(
  prisma: PrismaLike,
  options: { tenantId: string; templateId: string }
) {
  const template = await prisma.template.findFirst({
    where: {
      id: options.templateId,
      OR: [{ sourceType: "STARTER" }, { sourceType: "CUSTOM", tenantId: options.tenantId }],
    },
    include: {
      versions: true,
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!template) {
    throw new ApiRequestError(404, "template_not_found", "Template not found.");
  }

  const sites = await prisma.site.findMany({
    where: {
      templateId: template.id,
      tenantId: options.tenantId,
    },
    include: {
      settings: true,
      pages: {
        include: {
          currentDraftRevision: {
            select: { content: true },
          },
          currentPublishedRevision: {
            select: { content: true },
          },
        },
      },
      templateVersion: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const effectiveManifest = getEffectiveTemplateManifest(template, { useDraft: false });

  return sites.map((site) => ({
    id: site.id,
    name: site.name,
    slug: site.slug,
    status: site.status,
    templateVersion: site.templateVersion
      ? {
          id: site.templateVersion.id,
          version: site.templateVersion.version,
          manifestKey: site.templateVersion.manifestKey,
        }
      : null,
    hasTemplateDrift: computeSiteDrift({
      effectiveManifest,
      site,
    }),
  }));
}

export function buildSiteSettingsDefaults(manifest?: TemplateManifest | null) {
  const defaults: StarterSiteSettings = manifest?.starterSiteSettings ?? {};
  const navigationDefaults = buildNavigationDefaults({
    starterPrimary: manifest?.starterNavigation.primary ?? null,
    starterFooter: manifest?.starterNavigation.footer ?? null,
    supportedPages: manifest?.supportedPages ?? null,
  });

  return {
    logoUrl: defaults.logoUrl ?? null,
    faviconUrl: defaults.faviconUrl ?? null,
    tagline: defaults.tagline ?? null,
    contactEmail: defaults.contactEmail ?? null,
    contactPhone: defaults.contactPhone ?? null,
    address: defaults.address ?? null,
    socialLinks: defaults.socialLinks ? toJsonInput(defaults.socialLinks) : undefined,
    seoTitle: defaults.seoTitle ?? null,
    seoDescription: defaults.seoDescription ?? null,
    theme: defaults.theme ? toJsonInput(defaults.theme) : undefined,
    primaryNavigation: navigationDefaults.primaryNavigation,
    footerNavigation: navigationDefaults.footerNavigation,
    locale: defaults.locale ?? null,
    timezone: defaults.timezone ?? null,
  };
}
