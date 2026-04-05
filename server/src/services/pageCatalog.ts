import crypto from "crypto";

import type { Prisma, PrismaClient } from "@prisma/client";

import { getTemplateManifest } from "../templates/registry";
import type {
  SupportedPageDefinition,
  TemplateManifest,
} from "../templates/types";

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function checksumForContent(content: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

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
    include: { template: true },
  });

  if (!site?.template?.key) {
    return null;
  }

  return getTemplateManifest(site.template.key);
}

export async function listSupportedPagesForSite(
  prisma: PrismaClient,
  siteId: string
) {
  const manifest = await getSiteTemplateManifest(prisma, siteId);
  return manifest?.supportedPages ?? getFallbackSupportedPages();
}

export async function getSupportedPageForSite(
  prisma: PrismaClient,
  siteId: string,
  pageKey: string
) {
  const pages = await listSupportedPagesForSite(prisma, siteId);
  return pages.find((page) => page.pageKey === pageKey) ?? null;
}

export async function ensureStarterPagesForSite(
  prisma: PrismaClient,
  options: {
    siteId: string;
    adminId?: string | null;
  }
) {
  const supportedPages = await listSupportedPagesForSite(prisma, options.siteId);

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
