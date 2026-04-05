import type { Prisma, PrismaClient } from "@prisma/client";

import {
  buildSiteSettingsDefaults,
  ensureTemplateCatalog,
  resolveTemplateSelection,
} from "./templateCatalog";
import { ensureStarterPagesForSite } from "./pageCatalog";

type SiteWithRelations = Prisma.SiteGetPayload<{
  include: {
    template: true;
    templateVersion: true;
    settings: true;
  };
}>;

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
  };
}

export async function listAdminSites(prisma: PrismaClient, tenantId: string) {
  const sites = await prisma.site.findMany({
    where: { tenantId },
    include: {
      template: true,
      templateVersion: true,
      settings: true,
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
    },
  });

  if (!site) {
    return null;
  }

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
  await ensureTemplateCatalog(prisma);

  const templateSelection = await resolveTemplateSelection(prisma, {
    templateKey: options.templateKey ?? null,
    templateVersion: options.templateVersion ?? null,
  });

  const site = await prisma.site.create({
    data: {
      tenantId: options.tenantId,
      name: options.name,
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

  await prisma.siteSettings.create({
    data: {
      siteId: site.id,
      ...buildSiteSettingsDefaults(templateSelection?.manifest),
    },
  });

  await prisma.workPageMeta.upsert({
    where: { siteId_key: { siteId: site.id, key: "work" } },
    update: {},
    create: { siteId: site.id, key: "work" },
  });

  await ensureStarterPagesForSite(prisma, { siteId: site.id });

  return getAdminSiteDetail(prisma, {
    tenantId: options.tenantId,
    siteId: site.id,
  });
}
