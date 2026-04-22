import type { PrismaClient } from "@prisma/client";

import {
  ensureWorkMeta,
  findPublicProjectBySlug,
  listPublicProjects,
  listPublicTags,
} from "./workCollection";

export async function getPublicWorkMeta(prisma: PrismaClient, siteId: string) {
  const meta = await prisma.workPageMeta.findUnique({
    where: { siteId_key: { siteId, key: "work" } },
  });

  return {
    title: meta?.titlePublished ?? "Our Work",
    subtitle: meta?.subtitlePublished ?? "",
  };
}

export async function getAdminCompatibleWorkMeta(
  prisma: PrismaClient,
  siteId: string
) {
  const meta = await ensureWorkMeta(prisma, siteId);
  return {
    title: meta.titlePublished,
    subtitle: meta.subtitlePublished,
  };
}

export async function listPublicWorkTags(prisma: PrismaClient, siteId: string) {
  return listPublicTags(prisma, siteId);
}

export async function listPublicWorkProjectsBySite(
  prisma: PrismaClient,
  options: { siteId: string; tagSlug?: string }
) {
  return listPublicProjects(prisma, options);
}

export async function getPublicWorkProjectBySlug(
  prisma: PrismaClient,
  options: { siteId: string; slug: string }
) {
  return findPublicProjectBySlug(prisma, options);
}
