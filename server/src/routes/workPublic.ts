import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";

const router = Router();

const tagQuerySchema = z.object({
  tag: z.string().min(1).optional(),
});

const slugParamsSchema = z.object({
  slug: z.string().min(1),
});

router.get("/meta", async (_req, res) => {
  const meta = await prisma.workPageMeta.findUnique({
    where: { key: "work" },
  });

  return res.json({
    title: meta?.titlePublished ?? "Our Work",
    subtitle: meta?.subtitlePublished ?? "",
  });
});

router.get("/tags", async (_req, res) => {
  const tags = await prisma.workTag.findMany({
    where: {
      projects: {
        some: {
          project: { status: "PUBLISHED" },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return res.json({ tags });
});

router.get("/projects", async (req, res) => {
  const parsed = tagQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid query." } });
  }

  const tagSlug = parsed.data.tag;

  const projects = await prisma.workProject.findMany({
    where: {
      status: "PUBLISHED",
      ...(tagSlug
        ? {
            tags: {
              some: {
                tag: {
                  slug: tagSlug,
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

  return res.json({
    projects: projects.map((project) => ({
      id: project.id,
      title: project.titlePublished ?? project.titleDraft,
      slug: project.slugPublished ?? project.slugDraft,
      excerpt: project.excerptPublished ?? project.excerptDraft,
      coverImage: project.coverImagePublished ?? project.coverImageDraft,
      tags: project.tags.map((item) => item.tag),
    })),
  });
});

router.get("/projects/:slug", async (req, res) => {
  const parsed = slugParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid slug." } });
  }

  const project = await prisma.workProject.findFirst({
    where: {
      status: "PUBLISHED",
      slugPublished: parsed.data.slug,
    },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!project) {
    return res.status(404).json({ ok: false, error: { message: "Project not found." } });
  }

  return res.json({
    project: {
      id: project.id,
      title: project.titlePublished ?? project.titleDraft,
      slug: project.slugPublished ?? project.slugDraft,
      excerpt: project.excerptPublished ?? project.excerptDraft,
      coverImage: project.coverImagePublished ?? project.coverImageDraft,
      tags: project.tags.map((item) => item.tag),
      content: project.publishedContent,
    },
  });
});

export default router;
