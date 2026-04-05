import type { Prisma, PrismaClient, TemplateStatus } from "@prisma/client";

import { getTemplateManifest, listTemplateManifests } from "../templates/registry";
import type { StarterSiteSettings, TemplateManifest } from "../templates/types";

type TemplateRecord = Prisma.TemplateGetPayload<{
  include: {
    versions: true;
  };
}>;

function toJsonInput(value: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;
  return value as Prisma.InputJsonObject;
}

export async function ensureTemplateCatalog(prisma: PrismaClient) {
  const manifests = listTemplateManifests();

  for (const manifest of manifests) {
    const template = await prisma.template.upsert({
      where: { key: manifest.key },
      update: {
        name: manifest.name,
        category: manifest.category,
        description: manifest.description,
        status: "ACTIVE",
      },
      create: {
        key: manifest.key,
        name: manifest.name,
        category: manifest.category,
        description: manifest.description,
        status: "ACTIVE",
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
      },
      create: {
        templateId: template.id,
        version: manifest.version,
        manifestKey: manifest.key,
        isActive: true,
      },
    });
  }
}

function toTemplateSummary(record: TemplateRecord) {
  const activeVersion = record.versions.find((version) => version.isActive) ?? record.versions[0] ?? null;
  const manifest = getTemplateManifest(record.key);

  return {
    key: record.key,
    name: record.name,
    category: record.category,
    description: record.description,
    status: record.status,
    activeVersion: activeVersion
      ? {
          version: activeVersion.version,
          manifestKey: activeVersion.manifestKey,
        }
      : null,
    manifest: manifest
      ? {
          starterNavigation: manifest.starterNavigation,
          starterContentHints: manifest.starterContentHints,
          editableFieldGroups: manifest.editableFieldGroups,
        }
      : null,
  };
}

export async function listActiveTemplates(
  prisma: PrismaClient,
  options?: { category?: string | null }
) {
  await ensureTemplateCatalog(prisma);

  const templates = await prisma.template.findMany({
    where: {
      status: "ACTIVE",
      ...(options?.category ? { category: options.category } : {}),
    },
    include: {
      versions: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return templates.map(toTemplateSummary);
}

export async function getTemplateDetail(prisma: PrismaClient, templateKey: string) {
  await ensureTemplateCatalog(prisma);

  const template = await prisma.template.findUnique({
    where: { key: templateKey },
    include: {
      versions: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!template || template.status !== "ACTIVE") {
    return null;
  }

  const activeVersion = template.versions[0] ?? null;
  const manifest = getTemplateManifest(template.key);

  return {
    key: template.key,
    name: template.name,
    category: template.category,
    description: template.description,
    status: template.status,
    activeVersion: activeVersion
      ? {
          id: activeVersion.id,
          version: activeVersion.version,
          manifestKey: activeVersion.manifestKey,
        }
      : null,
    manifest,
  };
}

export async function resolveTemplateSelection(
  prisma: PrismaClient,
  options: {
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

  const version =
    template.versions.find((entry) =>
      options.templateVersion ? entry.version === options.templateVersion : entry.isActive
    ) ?? null;

  if (!version || !version.isActive) {
    return null;
  }

  const manifest = getTemplateManifest(template.key);
  if (!manifest) {
    return null;
  }

  return {
    template,
    version,
    manifest,
  };
}

export function buildSiteSettingsDefaults(manifest?: TemplateManifest | null) {
  const defaults: StarterSiteSettings = manifest?.starterSiteSettings ?? {};

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
    locale: defaults.locale ?? null,
    timezone: defaults.timezone ?? null,
  };
}
