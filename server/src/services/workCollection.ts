import type { Prisma, PrismaClient } from "@prisma/client";

export function toInputJsonObject(value: unknown): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Prisma.InputJsonObject;
}

export type AdminProjectRecord = Prisma.WorkProjectGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

export type PublicProjectRecord = Prisma.WorkProjectGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

export function toAdminProject(project: AdminProjectRecord) {
  const tags = project.tags.map((item) => item.tag);
  return {
    id: project.id,
    templateId: project.templateId,
    title: project.titleDraft,
    slug: project.slugDraft,
    excerpt: project.excerptDraft,
    coverImage: project.coverImageDraft,
    draftContent: project.draftContent,
    status: project.status,
    publishedAt: project.publishedAt,
    tags,
    tagIds: tags.map((tag) => tag.id),
  };
}

export function toPublicProject(project: PublicProjectRecord) {
  return {
    id: project.id,
    title: project.titlePublished ?? project.titleDraft,
    slug: project.slugPublished ?? project.slugDraft,
    excerpt: project.excerptPublished ?? project.excerptDraft,
    coverImage: project.coverImagePublished ?? project.coverImageDraft,
    tags: project.tags.map((item) => item.tag),
    content: project.publishedContent,
  };
}

export async function ensureWorkMeta(prisma: PrismaClient, siteId: string) {
  return prisma.workPageMeta.upsert({
    where: { siteId_key: { siteId, key: "work" } },
    update: {},
    create: { siteId, key: "work" },
  });
}

export async function listScopedTags(prisma: PrismaClient, siteId: string) {
  return prisma.workTag.findMany({
    where: { siteId },
    orderBy: { createdAt: "asc" },
  });
}

export async function findScopedTag(
  prisma: PrismaClient,
  options: { siteId: string; id: string }
) {
  return prisma.workTag.findFirst({
    where: { id: options.id, siteId: options.siteId },
    select: { id: true },
  });
}

export async function countValidTags(
  prisma: PrismaClient,
  options: { siteId: string; tagIds: string[] }
) {
  return prisma.workTag.count({
    where: { siteId: options.siteId, id: { in: options.tagIds } },
  });
}

export async function countTagUsage(
  prisma: PrismaClient,
  options: { siteId: string; tagId: string }
) {
  return prisma.workProjectTag.count({
    where: {
      tagId: options.tagId,
      project: { siteId: options.siteId },
    },
  });
}

export async function listAdminProjects(prisma: PrismaClient, siteId: string) {
  const projects = await prisma.workProject.findMany({
    where: { siteId },
    orderBy: { updatedAt: "desc" },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  return projects.map(toAdminProject);
}

export async function findAdminProject(
  prisma: PrismaClient,
  options: { siteId: string; id: string }
) {
  const project = await prisma.workProject.findFirst({
    where: { id: options.id, siteId: options.siteId },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  return project ? toAdminProject(project) : null;
}

export async function findScopedProjectWithTags(
  prisma: PrismaClient,
  options: { siteId: string; id: string }
) {
  return prisma.workProject.findFirst({
    where: { id: options.id, siteId: options.siteId },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });
}

export async function findScopedProjectWithTagLinks(
  prisma: PrismaClient,
  options: { siteId: string; id: string }
) {
  return prisma.workProject.findFirst({
    where: { id: options.id, siteId: options.siteId },
    include: {
      tags: true,
    },
  });
}

export async function listPublicTags(prisma: PrismaClient, siteId: string) {
  return prisma.workTag.findMany({
    where: {
      siteId,
      projects: {
        some: {
          project: { status: "PUBLISHED", siteId },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function listPublicProjects(
  prisma: PrismaClient,
  options: { siteId: string; tagSlug?: string }
) {
  const projects = await prisma.workProject.findMany({
    where: {
      siteId: options.siteId,
      status: "PUBLISHED",
      ...(options.tagSlug
        ? {
            tags: {
              some: {
                tag: {
                  slug: options.tagSlug,
                  siteId: options.siteId,
                },
              },
            },
          }
        : {}),
    },
    include: {
      tags: {
        include: { tag: true },
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  return projects.map(toPublicProject);
}

export async function findPublicProjectBySlug(
  prisma: PrismaClient,
  options: { siteId: string; slug: string }
) {
  const project = await prisma.workProject.findFirst({
    where: {
      siteId: options.siteId,
      status: "PUBLISHED",
      slugPublished: options.slug,
    },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  return project ? toPublicProject(project) : null;
}
