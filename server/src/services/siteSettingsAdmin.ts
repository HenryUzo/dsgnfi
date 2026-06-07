import type { Prisma, PrismaClient } from "@prisma/client";

import { listSupportedPagesForSite } from "./pageCatalog";
import {
  buildNavigationDefaults,
  normalizeNavigationItems,
} from "./sitePresentation";
import { writeAuditLog } from "./auditLog";
import { getEffectiveTemplateManifest } from "./templateCatalog";
import { toPageHierarchyPayload } from "./pageHierarchy";

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function ensureSiteSettings(prisma: PrismaClient, siteId: string) {
  const existing = await prisma.siteSettings.findUnique({
    where: { siteId },
  });

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      template: true,
      templateVersion: true,
    },
  });

  if (!site) {
    return null;
  }

  const supportedPages = await listSupportedPagesForSite(prisma, siteId);
  const manifest =
    site.template
      ? getEffectiveTemplateManifest(
          {
            ...site.template,
            versions: site.templateVersion
              ? [
                  site.templateVersion,
                ]
              : [],
          },
          { useDraft: false }
        )
      : null;
  const navigationDefaults = buildNavigationDefaults({
    starterPrimary: manifest?.starterNavigation.primary ?? null,
    starterFooter: manifest?.starterNavigation.footer ?? null,
    supportedPages,
  });

  if (existing) {
    if (existing.primaryNavigation && existing.footerNavigation) {
      return existing;
    }

    return prisma.siteSettings.update({
      where: { siteId },
      data: {
        primaryNavigation:
          existing.primaryNavigation ?? navigationDefaults.primaryNavigation,
        footerNavigation:
          existing.footerNavigation ?? navigationDefaults.footerNavigation,
      },
    });
  }

  return prisma.siteSettings.create({
    data: {
      siteId,
      primaryNavigation: navigationDefaults.primaryNavigation,
      footerNavigation: navigationDefaults.footerNavigation,
    },
  });
}

export async function getAdminSiteSettings(prisma: PrismaClient, siteId: string) {
  await ensureSiteSettings(prisma, siteId);
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      settings: true,
      pages: {
        select: {
          pageKey: true,
          title: true,
          slug: true,
          hierarchyRole: true,
          defaultParentPageKey: true,
        },
      },
    },
  });

  if (!site) {
    return null;
  }

  const pageMap = new Map(site.pages.map((page) => [page.pageKey, page]));

  return {
    site: {
      id: site.id,
      name: site.name,
      slug: site.slug,
    },
    settings: {
      siteName: site.name,
      logoUrl: site.settings?.logoUrl ?? null,
      faviconUrl: site.settings?.faviconUrl ?? null,
      tagline: site.settings?.tagline ?? null,
      contactEmail: site.settings?.contactEmail ?? null,
      contactPhone: site.settings?.contactPhone ?? null,
      address: site.settings?.address ?? null,
      socialLinks: (site.settings?.socialLinks as Record<string, string> | null) ?? {},
      seoTitle: site.settings?.seoTitle ?? null,
      seoDescription: site.settings?.seoDescription ?? null,
      locale: site.settings?.locale ?? null,
      timezone: site.settings?.timezone ?? null,
    },
    theme: (site.settings?.theme as Record<string, unknown> | null) ?? {},
    pages: site.pages.map((page) => ({
      pageKey: page.pageKey,
      title: page.title,
      slug: page.slug,
      hierarchy: toPageHierarchyPayload(
        page,
        page.defaultParentPageKey ? pageMap.get(page.defaultParentPageKey) ?? null : null
      ),
    })),
    navigation: {
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
      ),
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
      ),
    },
  };
}

export async function updateAdminSiteSettings(
  prisma: PrismaClient,
  options: {
    siteId: string;
    adminId?: string | null;
    payload: {
      siteName: string;
      logoUrl: string | null;
      faviconUrl: string | null;
      tagline: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      address: string | null;
      socialLinks: Record<string, string>;
      seoTitle: string | null;
      seoDescription: string | null;
      locale: string | null;
      timezone: string | null;
      theme: Record<string, unknown>;
    };
  }
) {
  await ensureSiteSettings(prisma, options.siteId);

  await prisma.$transaction([
    prisma.site.update({
      where: { id: options.siteId },
      data: {
        name: options.payload.siteName,
      },
    }),
    prisma.siteSettings.update({
      where: { siteId: options.siteId },
      data: {
        logoUrl: options.payload.logoUrl,
        faviconUrl: options.payload.faviconUrl,
        tagline: options.payload.tagline,
        contactEmail: options.payload.contactEmail,
        contactPhone: options.payload.contactPhone,
        address: options.payload.address,
        socialLinks: toJsonInput(options.payload.socialLinks),
        seoTitle: options.payload.seoTitle,
        seoDescription: options.payload.seoDescription,
        locale: options.payload.locale,
        timezone: options.payload.timezone,
        theme: toJsonInput(options.payload.theme),
      },
    }),
  ]);

  await writeAuditLog(prisma, {
    actorAdminUserId: options.adminId ?? null,
    siteId: options.siteId,
    action: "site_settings.updated",
    entityType: "site_settings",
    entityId: options.siteId,
    metadata: {
      siteName: options.payload.siteName,
      hasLogoUrl: Boolean(options.payload.logoUrl),
      hasFaviconUrl: Boolean(options.payload.faviconUrl),
      themeKeys: Object.keys(options.payload.theme ?? {}),
    },
  });

  await writeAuditLog(prisma, {
    actorAdminUserId: options.adminId ?? null,
    siteId: options.siteId,
    action: "site_theme.updated",
    entityType: "site_settings",
    entityId: options.siteId,
    metadata: {
      theme: options.payload.theme,
    },
  });

  return getAdminSiteSettings(prisma, options.siteId);
}

export async function updateAdminSiteNavigation(
  prisma: PrismaClient,
  options: {
    siteId: string;
    adminId?: string | null;
    payload: {
      primaryNavigation: unknown[];
      footerNavigation: unknown[];
    };
  }
) {
  await ensureSiteSettings(prisma, options.siteId);

  await prisma.siteSettings.update({
    where: { siteId: options.siteId },
    data: {
      primaryNavigation: toJsonInput(options.payload.primaryNavigation),
      footerNavigation: toJsonInput(options.payload.footerNavigation),
    },
  });

  await writeAuditLog(prisma, {
    actorAdminUserId: options.adminId ?? null,
    siteId: options.siteId,
    action: "site_navigation.updated",
    entityType: "site_settings",
    entityId: options.siteId,
    metadata: {
      primaryCount: options.payload.primaryNavigation.length,
      footerCount: options.payload.footerNavigation.length,
    },
  });

  return getAdminSiteSettings(prisma, options.siteId);
}
