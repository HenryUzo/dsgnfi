import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { withPublicSiteContext } from "../middleware/withPublicSiteContext";

const router = Router();

const tagQuerySchema = z.object({
  tag: z.string().min(1).optional(),
});

const slugParamsSchema = z.object({
  slug: z.string().min(1),
});

router.use(withPublicSiteContext);

router.get("/meta", async (req, res) => {
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing public site context." },
    });
  }

  const meta = await prisma.workPageMeta.findUnique({
    where: { siteId_key: { siteId, key: "work" } },
  });

  return res.json({
    title: meta?.titlePublished ?? "Our Work",
    subtitle: meta?.subtitlePublished ?? "",
  });
});

router.get("/tags", async (req, res) => {
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing public site context." },
    });
  }

  const tags = await prisma.workTag.findMany({
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

  return res.json({ tags });
});

router.get("/projects", async (req, res) => {
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing public site context." },
    });
  }

  const parsed = tagQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid query." } });
  }

  const tagSlug = parsed.data.tag;

  const projects = await prisma.workProject.findMany({
    where: {
      siteId,
      status: "PUBLISHED",
      ...(tagSlug
        ? {
            tags: {
              some: {
                tag: {
                  slug: tagSlug,
                  siteId,
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
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing public site context." },
    });
  }

  const parsed = slugParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid slug." } });
  }

  const project = await prisma.workProject.findFirst({
    where: {
      siteId,
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
