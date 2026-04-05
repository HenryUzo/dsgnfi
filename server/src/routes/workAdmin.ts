import { Prisma } from "@prisma/client";
import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";

const router = Router();

const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens.");

const metaDraftSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
});

const tagCreateSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
});

const tagUpdateSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
});

const projectCreateSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().min(1),
  slug: slugSchema,
  excerpt: z.string().min(1),
  coverImage: z.string().min(1),
  tagIds: z.array(z.string().uuid()).min(1, "Project must have at least one tag."),
  draftContent: z.record(z.string(), z.unknown()),
});

const projectUpdateSchema = z.object({
  title: z.string().min(1),
  slug: slugSchema,
  excerpt: z.string().min(1),
  coverImage: z.string().min(1),
  tagIds: z.array(z.string().uuid()).min(1, "Project must have at least one tag."),
  draftContent: z.record(z.string(), z.unknown()),
});

const paramsIdSchema = z.object({
  id: z.string().uuid(),
});

function isUniqueError(err: unknown) {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  );
}

type AdminProjectRecord = Prisma.WorkProjectGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

function toInputJsonObject(value: unknown): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Prisma.InputJsonObject;
}

function toAdminProject(project: AdminProjectRecord) {
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

function getSiteId(req: Request, res: Response): string | null {
  const siteId = req.context?.siteId;
  if (!siteId) {
    res.status(500).json({
      ok: false,
      error: { message: "Missing admin site context." },
    });
    return null;
  }

  return siteId;
}

router.use(requireAdmin, withAdminSiteContext);

router.get("/meta", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const meta = await prisma.workPageMeta.upsert({
    where: { siteId_key: { siteId, key: "work" } },
    update: {},
    create: { siteId, key: "work" },
  });

  return res.json({
    title: meta.titleDraft,
    subtitle: meta.subtitleDraft,
    status: meta.status,
    publishedAt: meta.publishedAt,
  });
});

router.put("/meta", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsed = metaDraftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  await prisma.workPageMeta.upsert({
    where: { siteId_key: { siteId, key: "work" } },
    update: {
      titleDraft: parsed.data.title,
      subtitleDraft: parsed.data.subtitle,
      status: "DRAFT",
    },
    create: {
      siteId,
      key: "work",
      titleDraft: parsed.data.title,
      subtitleDraft: parsed.data.subtitle,
      titlePublished: parsed.data.title,
      subtitlePublished: parsed.data.subtitle,
      status: "DRAFT",
    },
  });

  return res.json({ ok: true });
});

router.post("/meta/publish", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const meta = await prisma.workPageMeta.upsert({
    where: { siteId_key: { siteId, key: "work" } },
    update: {},
    create: { siteId, key: "work" },
  });

  await prisma.workPageMeta.update({
    where: { siteId_key: { siteId, key: "work" } },
    data: {
      titlePublished: meta.titleDraft,
      subtitlePublished: meta.subtitleDraft,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  return res.json({ ok: true });
});

router.get("/tags", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const tags = await prisma.workTag.findMany({
    where: { siteId },
    orderBy: { createdAt: "asc" },
  });
  return res.json({ tags });
});

router.post("/tags", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsed = tagCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  try {
    const tag = await prisma.workTag.create({ data: { siteId, ...parsed.data } });
    return res.status(201).json({ tag });
  } catch (err) {
    if (isUniqueError(err)) {
      return res.status(409).json({
        ok: false,
        error: { message: "Tag slug already exists. Choose a different slug." },
      });
    }
    throw err;
  }
});

router.patch("/tags/:id", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedId = paramsIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid tag id." } });
  }

  const parsed = tagUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const existingTag = await prisma.workTag.findFirst({
    where: { id: parsedId.data.id, siteId },
    select: { id: true },
  });
  if (!existingTag) {
    return res.status(404).json({ ok: false, error: { message: "Tag not found." } });
  }

  try {
    const tag = await prisma.workTag.update({
      where: { id: parsedId.data.id },
      data: parsed.data,
    });
    return res.json({ tag });
  } catch (err) {
    if (isUniqueError(err)) {
      return res.status(409).json({
        ok: false,
        error: { message: "Tag slug already exists. Choose a different slug." },
      });
    }
    throw err;
  }
});

router.delete("/tags/:id", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedId = paramsIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid tag id." } });
  }

  const existingTag = await prisma.workTag.findFirst({
    where: { id: parsedId.data.id, siteId },
    select: { id: true },
  });
  if (!existingTag) {
    return res.status(404).json({ ok: false, error: { message: "Tag not found." } });
  }

  const usage = await prisma.workProjectTag.count({
    where: {
      tagId: parsedId.data.id,
      project: { siteId },
    },
  });
  if (usage > 0) {
    return res.status(409).json({
      ok: false,
      error: { message: "Tag is in use by one or more projects and cannot be deleted." },
    });
  }

  await prisma.workTag.delete({ where: { id: parsedId.data.id } });
  return res.json({ ok: true });
});

router.get("/projects", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const projects = await prisma.workProject.findMany({
    where: { siteId },
    orderBy: { updatedAt: "desc" },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  return res.json({
    projects: projects.map(toAdminProject),
  });
});

router.get("/projects/:id", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedId = paramsIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid project id." } });
  }

  const project = await prisma.workProject.findFirst({
    where: { id: parsedId.data.id, siteId },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!project) {
    return res.status(404).json({ ok: false, error: { message: "Project not found." } });
  }

  return res.json({ project: toAdminProject(project) });
});

router.post("/projects", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsed = projectCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const tagsCount = await prisma.workTag.count({
    where: { siteId, id: { in: parsed.data.tagIds } },
  });
  if (tagsCount !== parsed.data.tagIds.length) {
    return res.status(400).json({
      ok: false,
      error: { message: "One or more selected tags are invalid." },
    });
  }

  try {
    const project = await prisma.workProject.create({
      data: {
        siteId,
        templateId: parsed.data.templateId,
        titleDraft: parsed.data.title,
        slugDraft: parsed.data.slug,
        excerptDraft: parsed.data.excerpt,
        coverImageDraft: parsed.data.coverImage,
        draftContent: toInputJsonObject(parsed.data.draftContent),
        tags: {
          create: parsed.data.tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });
    return res.status(201).json({ project: toAdminProject(project) });
  } catch (err) {
    if (isUniqueError(err)) {
      return res.status(409).json({
        ok: false,
        error: {
          message:
            "A project with this slug already exists. Choose a unique slug.",
        },
      });
    }
    throw err;
  }
});

router.put("/projects/:id", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedId = paramsIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid project id." } });
  }

  const parsed = projectUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const existingProject = await prisma.workProject.findFirst({
    where: { id: parsedId.data.id, siteId },
    select: { id: true },
  });
  if (!existingProject) {
    return res.status(404).json({ ok: false, error: { message: "Project not found." } });
  }

  const tagsCount = await prisma.workTag.count({
    where: { siteId, id: { in: parsed.data.tagIds } },
  });
  if (tagsCount !== parsed.data.tagIds.length) {
    return res.status(400).json({
      ok: false,
      error: { message: "One or more selected tags are invalid." },
    });
  }

  try {
    const project = await prisma.workProject.update({
      where: { id: parsedId.data.id },
      data: {
        titleDraft: parsed.data.title,
        slugDraft: parsed.data.slug,
        excerptDraft: parsed.data.excerpt,
        coverImageDraft: parsed.data.coverImage,
        draftContent: toInputJsonObject(parsed.data.draftContent),
        status: "DRAFT",
        tags: {
          deleteMany: {},
          create: parsed.data.tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });
    return res.json({ project: toAdminProject(project) });
  } catch (err) {
    if (isUniqueError(err)) {
      return res.status(409).json({
        ok: false,
        error: {
          message:
            "A project with this slug already exists. Choose a unique slug.",
        },
      });
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return res.status(404).json({ ok: false, error: { message: "Project not found." } });
    }
    throw err;
  }
});

router.post("/projects/:id/publish", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedId = paramsIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid project id." } });
  }

  const project = await prisma.workProject.findFirst({
    where: { id: parsedId.data.id, siteId },
    include: {
      tags: true,
    },
  });
  if (!project) {
    return res.status(404).json({ ok: false, error: { message: "Project not found." } });
  }
  if (project.tags.length === 0) {
    return res.status(400).json({
      ok: false,
      error: { message: "Project must have at least one tag before publishing." },
    });
  }

  try {
    await prisma.workProject.update({
      where: { id: parsedId.data.id },
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
    return res.json({ ok: true });
  } catch (err) {
    if (isUniqueError(err)) {
      return res.status(409).json({
        ok: false,
        error: {
          message:
            "Cannot publish because this slug is already used by another published project.",
        },
      });
    }
    throw err;
  }
});

router.post("/projects/:id/duplicate", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedId = paramsIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid project id." } });
  }

  const original = await prisma.workProject.findFirst({
    where: { id: parsedId.data.id, siteId },
    include: {
      tags: true,
    },
  });
  if (!original) {
    return res.status(404).json({ ok: false, error: { message: "Project not found." } });
  }
  if (original.tags.length === 0) {
    return res.status(400).json({
      ok: false,
      error: { message: "Cannot duplicate a project without at least one tag." },
    });
  }

  let attempt = 1;
  while (attempt < 100) {
    const nextSlug = `${original.slugDraft}-copy${attempt > 1 ? `-${attempt}` : ""}`;
    try {
      const duplicated = await prisma.workProject.create({
        data: {
          siteId,
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

      return res.status(201).json({ project: toAdminProject(duplicated) });
    } catch (err) {
      if (isUniqueError(err)) {
        attempt += 1;
        continue;
      }
      throw err;
    }
  }

  return res.status(409).json({
    ok: false,
    error: { message: "Unable to create duplicate with a unique slug." },
  });
});

export default router;

