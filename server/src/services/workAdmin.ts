import { Prisma, type PrismaClient } from "@prisma/client";

import {
  countTagUsage,
  countValidTags,
  ensureWorkMeta,
  findAdminProject,
  findScopedProjectWithTagLinks,
  findScopedProjectWithTags,
  findScopedTag,
  listAdminProjects,
  listScopedTags,
  toAdminProject,
  toInputJsonObject,
} from "./workCollection";

function isUniqueError(err: unknown) {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  );
}

export async function getAdminWorkMeta(prisma: PrismaClient, siteId: string) {
  const meta = await ensureWorkMeta(prisma, siteId);
  return {
    title: meta.titleDraft,
    subtitle: meta.subtitleDraft,
    status: meta.status,
    publishedAt: meta.publishedAt,
  };
}

export async function saveAdminWorkMetaDraft(
  prisma: PrismaClient,
  options: { siteId: string; title: string; subtitle: string }
) {
  await prisma.workPageMeta.upsert({
    where: { siteId_key: { siteId: options.siteId, key: "work" } },
    update: {
      titleDraft: options.title,
      subtitleDraft: options.subtitle,
      status: "DRAFT",
    },
    create: {
      siteId: options.siteId,
      key: "work",
      titleDraft: options.title,
      subtitleDraft: options.subtitle,
      titlePublished: options.title,
      subtitlePublished: options.subtitle,
      status: "DRAFT",
    },
  });
}

export async function publishAdminWorkMeta(prisma: PrismaClient, siteId: string) {
  const meta = await ensureWorkMeta(prisma, siteId);

  await prisma.workPageMeta.update({
    where: { siteId_key: { siteId, key: "work" } },
    data: {
      titlePublished: meta.titleDraft,
      subtitlePublished: meta.subtitleDraft,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
}

export async function listAdminWorkTags(prisma: PrismaClient, siteId: string) {
  return listScopedTags(prisma, siteId);
}

export async function createAdminWorkTag(
  prisma: PrismaClient,
  options: { siteId: string; name: string; slug: string }
) {
  try {
    const tag = await prisma.workTag.create({
      data: {
        siteId: options.siteId,
        name: options.name,
        slug: options.slug,
      },
    });

    return { type: "success" as const, tag };
  } catch (err) {
    if (isUniqueError(err)) {
      return { type: "conflict" as const };
    }
    throw err;
  }
}

export async function updateAdminWorkTag(
  prisma: PrismaClient,
  options: { siteId: string; id: string; name: string; slug: string }
) {
  const existingTag = await findScopedTag(prisma, {
    siteId: options.siteId,
    id: options.id,
  });
  if (!existingTag) {
    return { type: "not_found" as const };
  }

  try {
    const tag = await prisma.workTag.update({
      where: { id: options.id },
      data: {
        name: options.name,
        slug: options.slug,
      },
    });

    return { type: "success" as const, tag };
  } catch (err) {
    if (isUniqueError(err)) {
      return { type: "conflict" as const };
    }
    throw err;
  }
}

export async function deleteAdminWorkTag(
  prisma: PrismaClient,
  options: { siteId: string; id: string }
) {
  const existingTag = await findScopedTag(prisma, {
    siteId: options.siteId,
    id: options.id,
  });
  if (!existingTag) {
    return { type: "not_found" as const };
  }

  const usage = await countTagUsage(prisma, {
    siteId: options.siteId,
    tagId: options.id,
  });
  if (usage > 0) {
    return { type: "in_use" as const };
  }

  await prisma.workTag.delete({ where: { id: options.id } });
  return { type: "success" as const };
}

export async function listAdminWorkProjects(prisma: PrismaClient, siteId: string) {
  return listAdminProjects(prisma, siteId);
}

export async function getAdminWorkProject(
  prisma: PrismaClient,
  options: { siteId: string; id: string }
) {
  return findAdminProject(prisma, options);
}

export async function createAdminWorkProject(
  prisma: PrismaClient,
  options: {
    siteId: string;
    templateId: string;
    title: string;
    slug: string;
    excerpt: string;
    coverImage: string;
    tagIds: string[];
    draftContent: Record<string, unknown>;
  }
) {
  const tagsCount = await countValidTags(prisma, {
    siteId: options.siteId,
    tagIds: options.tagIds,
  });
  if (tagsCount !== options.tagIds.length) {
    return { type: "invalid_tags" as const };
  }

  try {
    const project = await prisma.workProject.create({
      data: {
        siteId: options.siteId,
        templateId: options.templateId,
        titleDraft: options.title,
        slugDraft: options.slug,
        excerptDraft: options.excerpt,
        coverImageDraft: options.coverImage,
        draftContent: toInputJsonObject(options.draftContent),
        tags: {
          create: options.tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    return { type: "success" as const, project: toAdminProject(project) };
  } catch (err) {
    if (isUniqueError(err)) {
      return { type: "conflict" as const };
    }
    throw err;
  }
}

export async function updateAdminWorkProject(
  prisma: PrismaClient,
  options: {
    siteId: string;
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    coverImage: string;
    tagIds: string[];
    draftContent: Record<string, unknown>;
  }
) {
  const existingProject = await findScopedProjectWithTags(prisma, {
    siteId: options.siteId,
    id: options.id,
  });
  if (!existingProject) {
    return { type: "not_found" as const };
  }

  const tagsCount = await countValidTags(prisma, {
    siteId: options.siteId,
    tagIds: options.tagIds,
  });
  if (tagsCount !== options.tagIds.length) {
    return { type: "invalid_tags" as const };
  }

  try {
    const project = await prisma.workProject.update({
      where: { id: options.id },
      data: {
        titleDraft: options.title,
        slugDraft: options.slug,
        excerptDraft: options.excerpt,
        coverImageDraft: options.coverImage,
        draftContent: toInputJsonObject(options.draftContent),
        status: "DRAFT",
        tags: {
          deleteMany: {},
          create: options.tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    return { type: "success" as const, project: toAdminProject(project) };
  } catch (err) {
    if (isUniqueError(err)) {
      return { type: "conflict" as const };
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { type: "not_found" as const };
    }
    throw err;
  }
}

export async function publishAdminWorkProject(
  prisma: PrismaClient,
  options: { siteId: string; id: string }
) {
  const project = await findScopedProjectWithTagLinks(prisma, options);
  if (!project) {
    return { type: "not_found" as const };
  }
  if (project.tags.length === 0) {
    return { type: "invalid_tags" as const };
  }

  try {
    await prisma.workProject.update({
      where: { id: options.id },
      data: {
        titlePublished: project.titleDraft,
        slugPublished: project.slugDraft,
        excerptPublished: project.excerptDraft,
        coverImagePublished: project.coverImageDraft,
        publishedContent: toInputJsonObject(project.draftContent),
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    return { type: "success" as const };
  } catch (err) {
    if (isUniqueError(err)) {
      return { type: "publish_conflict" as const };
    }
    throw err;
  }
}

export async function duplicateAdminWorkProject(
  prisma: PrismaClient,
  options: { siteId: string; id: string }
) {
  const original = await findScopedProjectWithTagLinks(prisma, options);
  if (!original) {
    return { type: "not_found" as const };
  }
  if (original.tags.length === 0) {
    return { type: "invalid_tags" as const };
  }

  let attempt = 1;
  while (attempt < 100) {
    const nextSlug = `${original.slugDraft}-copy${attempt > 1 ? `-${attempt}` : ""}`;
    try {
      const duplicated = await prisma.workProject.create({
        data: {
          siteId: options.siteId,
          templateId: original.templateId,
          titleDraft: `${original.titleDraft} Copy`,
          slugDraft: nextSlug,
          excerptDraft: original.excerptDraft,
          coverImageDraft: original.coverImageDraft,
          draftContent: toInputJsonObject(original.draftContent),
          status: "DRAFT",
          tags: {
            create: original.tags.map((item) => ({ tagId: item.tagId })),
          },
        },
        include: {
          tags: {
            include: { tag: true },
          },
        },
      });

      return { type: "success" as const, project: toAdminProject(duplicated) };
    } catch (err) {
      if (isUniqueError(err)) {
        attempt += 1;
        continue;
      }
      throw err;
    }
  }

  return { type: "conflict" as const };
}
