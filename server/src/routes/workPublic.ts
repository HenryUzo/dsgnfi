import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { withPublicSiteContext } from "../middleware/withPublicSiteContext";
import {
  getPublicWorkMeta,
  getPublicWorkProjectBySlug,
  listPublicWorkProjectsBySite,
  listPublicWorkTags,
} from "../services/workPublic";

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

  return res.json(await getPublicWorkMeta(prisma, siteId));
});

router.get("/tags", async (req, res) => {
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing public site context." },
    });
  }

  return res.json({ tags: await listPublicWorkTags(prisma, siteId) });
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

  return res.json({
    projects: await listPublicWorkProjectsBySite(prisma, {
      siteId,
      tagSlug: parsed.data.tag,
    }),
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

  const project = await getPublicWorkProjectBySlug(prisma, {
    siteId,
    slug: parsed.data.slug,
  });

  if (!project) {
    return res.status(404).json({ ok: false, error: { message: "Project not found." } });
  }

  return res.json({ project });
});

export default router;
