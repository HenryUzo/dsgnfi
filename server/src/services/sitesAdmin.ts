import type { Prisma, PrismaClient } from "@prisma/client";

import {
  buildSiteSettingsDefaults,
  ensureTemplateCatalog,
  getEffectiveTemplateManifest,
  listTemplateUsages,
  resolveTemplateSelection,
} from "./templateCatalog";
import { ensureStarterPagesForSite } from "./pageCatalog";
import { ApiRequestError } from "./apiErrors";
import { normalizeNavigationItems } from "./sitePresentation";

type SiteWithRelations = Prisma.SiteGetPayload<{
  include: {
    template: true;
    templateVersion: true;
    settings: true;
  };
}>;

function toStatusSummary(site: SiteWithRelations) {
  const primaryNavigation = normalizeNavigationItems(
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
  );
  const publishedPagesCount =
    "pages" in site && Array.isArray(site.pages)
      ? site.pages.filter((page) => page.currentPublishedRevisionId).length
      : 0;
  const activePreviewTokens =
    "previewTokens" in site && Array.isArray(site.previewTokens)
      ? site.previewTokens.filter(
          (token) => !token.revokedAt && token.expiresAt.getTime() > Date.now()
        ).length
      : 0;
  const readyDomain =
    "domains" in site && Array.isArray(site.domains)
      ? site.domains.some(
          (domain) =>
            domain.isPrimary &&
            (domain.type === "SUBDOMAIN" || domain.verificationStatus === "VERIFIED")
        )
      : false;

  return {
    templateAssigned: Boolean(site.templateId),
    brandingReady: Boolean(
      site.settings?.logoUrl ||
        site.settings?.tagline ||
        site.settings?.contactEmail ||
        (site.settings?.theme &&
          Object.keys(site.settings.theme as Record<string, unknown>).length > 0)
    ),
    navigationReady: primaryNavigation.some((item) => item.visible),
    publishedPagesCount,
    domainReady: readyDomain,
    previewReady: activePreviewTokens > 0,
    nextAction:
      !site.templateId
        ? "assign_template"
        : !site.settings?.tagline && !site.settings?.logoUrl
          ? "edit_branding"
          : !primaryNavigation.some((item) => item.visible)
            ? "edit_navigation"
            : publishedPagesCount === 0
              ? "publish_pages"
              : !readyDomain
                ? "connect_domain"
                : activePreviewTokens === 0
                  ? "create_preview"
                  : "edit_home",
  };
}

function toAdminSiteSummary(site: SiteWithRelations) {
  return {
    id: site.id,
    name: site.name,
    slug: site.slug,
    status: site.status,
    isDefault: site.isDefault,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
    template: site.template
      ? {
          id: site.template.id,
          key: site.template.key,
          name: site.template.name,
          category: site.template.category,
        }
      : null,
    templateVersion: site.templateVersion
      ? {
          id: site.templateVersion.id,
          version: site.templateVersion.version,
          manifestKey: site.templateVersion.manifestKey,
        }
      : null,
    templateSourceType: site.template?.sourceType ?? null,
    templateBaseKey: site.template?.baseTemplateKey ?? null,
    statusSummary: toStatusSummary(site),
  };
}

export async function listAdminSites(prisma: PrismaClient, tenantId: string) {
  const sites = await prisma.site.findMany({
    where: { tenantId },
    include: {
      template: true,
      templateVersion: true,
      settings: true,
      pages: {
        select: {
          currentPublishedRevisionId: true,
        },
      },
      domains: {
        select: {
          isPrimary: true,
          type: true,
          verificationStatus: true,
        },
      },
      previewTokens: {
        select: {
          revokedAt: true,
          expiresAt: true,
        },
      },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return sites.map(toAdminSiteSummary);
}

export async function getAdminSiteDetail(
  prisma: PrismaClient,
  options: {
    tenantId: string;
    siteId: string;
  }
) {
  const site = await prisma.site.findFirst({
    where: {
      id: options.siteId,
      tenantId: options.tenantId,
    },
    include: {
      template: true,
      templateVersion: true,
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
      domains: {
        select: {
          id: true,
          hostname: true,
          type: true,
          isPrimary: true,
          verificationStatus: true,
        },
      },
      previewTokens: {
        select: {
          revokedAt: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!site) {
    return null;
  }

  const effectiveManifest = site.template
    ? getEffectiveTemplateManifest(
        {
          ...site.template,
          versions: site.templateVersion ? [site.templateVersion] : [],
        },
        { useDraft: false }
      )
    : null;

  return {
    ...toAdminSiteSummary(site),
    settings: site.settings
      ? {
          logoUrl: site.settings.logoUrl,
          faviconUrl: site.settings.faviconUrl,
          tagline: site.settings.tagline,
          contactEmail: site.settings.contactEmail,
          contactPhone: site.settings.contactPhone,
          address: site.settings.address,
          socialLinks: site.settings.socialLinks,
          seoTitle: site.settings.seoTitle,
          seoDescription: site.settings.seoDescription,
          theme: site.settings.theme,
          locale: site.settings.locale,
          timezone: site.settings.timezone,
        }
      : null,
    templateRelationship: {
      sourceType: site.template?.sourceType ?? null,
      baseTemplateKey: site.template?.baseTemplateKey ?? null,
      activeVersionUsed: site.templateVersion
        ? {
            id: site.templateVersion.id,
            version: site.templateVersion.version,
            manifestKey: site.templateVersion.manifestKey,
          }
        : null,
      hasTemplateDrift:
        site.template && effectiveManifest
          ? (await listTemplateUsages(prisma, {
              tenantId: options.tenantId,
              templateId: site.template.id,
            })).find((entry) => entry.id === site.id)?.hasTemplateDrift ?? false
          : false,
    },
  };
}

export async function createAdminSite(
  prisma: PrismaClient,
  options: {
    tenantId: string;
    name: string;
    slug: string;
    templateKey?: string | null;
    templateVersion?: string | null;
  }
) {
  const runCreate = async (tx: Prisma.TransactionClient) => {
    const client = tx as unknown as PrismaClient;

    await ensureTemplateCatalog(client);

    const templateSelection = await resolveTemplateSelection(client, {
      tenantId: options.tenantId,
      templateKey: options.templateKey ?? null,
      templateVersion: options.templateVersion ?? null,
    });

    if ((options.templateKey || options.templateVersion) && !templateSelection) {
      throw new ApiRequestError(
        400,
        "site_template_invalid",
        "Selected template is invalid or inactive.",
        {
          templateKey: ["Selected template is invalid or inactive."],
        }
      );
    }

    const site = await tx.site.create({
      data: {
        tenantId: options.tenantId,
        name: options.name.trim(),
        slug: options.slug,
        status: "DRAFT",
        isDefault: false,
        templateId: templateSelection?.template.id,
        templateVersionId: templateSelection?.version.id,
      },
      include: {
        template: true,
        templateVersion: true,
        settings: true,
      },
    });

    await tx.siteSettings.create({
      data: {
        siteId: site.id,
        ...buildSiteSettingsDefaults(templateSelection?.manifest),
      },
    });

    await tx.workPageMeta.upsert({
      where: { siteId_key: { siteId: site.id, key: "work" } },
      update: {},
      create: { siteId: site.id, key: "work" },
    });

    await ensureStarterPagesForSite(client, { siteId: site.id });

    return site.id;
  };

  const maybePrisma = prisma as PrismaClient & {
    $transaction?: <T>(
      callback: (tx: Prisma.TransactionClient) => Promise<T>
    ) => Promise<T>;
  };

  const siteId =
    typeof maybePrisma.$transaction === "function"
      ? await maybePrisma.$transaction(runCreate)
      : await runCreate(prisma as unknown as Prisma.TransactionClient);

  return getAdminSiteDetail(prisma, {
    tenantId: options.tenantId,
    siteId,
  });
}

export async function updateAdminSiteTemplate(
  prisma: PrismaClient,
  options: {
    tenantId: string;
    siteId: string;
    templateKey: string;
    templateVersion?: string | null;
  }
) {
  const runUpdate = async (tx: Prisma.TransactionClient) => {
    const client = tx as unknown as PrismaClient;

    await ensureTemplateCatalog(client);

    const site = await tx.site.findFirst({
      where: {
        id: options.siteId,
        tenantId: options.tenantId,
      },
      include: {
        settings: true,
      },
    });

    if (!site) {
      throw new ApiRequestError(404, "site_not_found", "Site not found.");
    }

    const templateSelection = await resolveTemplateSelection(client, {
      tenantId: options.tenantId,
      templateKey: options.templateKey,
      templateVersion: options.templateVersion ?? null,
    });

    if (!templateSelection) {
      throw new ApiRequestError(
        400,
        "site_template_invalid",
        "Selected template is invalid or inactive.",
        {
          templateKey: ["Selected template is invalid or inactive."],
        }
      );
    }

    await tx.site.update({
      where: { id: site.id },
      data: {
        templateId: templateSelection.template.id,
        templateVersionId: templateSelection.version.id,
      },
    });

    if (!site.settings) {
      await tx.siteSettings.create({
        data: {
          siteId: site.id,
          ...buildSiteSettingsDefaults(templateSelection.manifest),
        },
      });
    }

    await tx.workPageMeta.upsert({
      where: { siteId_key: { siteId: site.id, key: "work" } },
      update: {},
      create: { siteId: site.id, key: "work" },
    });

    await ensureStarterPagesForSite(client, { siteId: site.id });

    return site.id;
  };

  const maybePrisma = prisma as PrismaClient & {
    $transaction?: <T>(
      callback: (tx: Prisma.TransactionClient) => Promise<T>
    ) => Promise<T>;
  };

  const siteId =
    typeof maybePrisma.$transaction === "function"
      ? await maybePrisma.$transaction(runUpdate)
      : await runUpdate(prisma as unknown as Prisma.TransactionClient);

  return getAdminSiteDetail(prisma, {
    tenantId: options.tenantId,
    siteId,
  });
}
