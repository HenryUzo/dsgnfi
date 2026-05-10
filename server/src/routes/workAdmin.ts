import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireRole } from "../middleware/requireRole";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import {
  createAdminWorkProject,
  createAdminWorkTag,
  deleteAdminWorkTag,
  duplicateAdminWorkProject,
  getAdminWorkMeta,
  getAdminWorkProject,
  listAdminWorkProjects,
  listAdminWorkTags,
  publishAdminWorkMeta,
  publishAdminWorkProject,
  saveAdminWorkMetaDraft,
  updateAdminWorkProject,
  updateAdminWorkTag,
} from "../services/workAdmin";

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

  return res.json(await getAdminWorkMeta(prisma, siteId));
});

router.put("/meta", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsed = metaDraftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  await saveAdminWorkMetaDraft(prisma, { siteId, ...parsed.data });
  return res.json({ ok: true });
});

router.post("/meta/publish", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  await publishAdminWorkMeta(prisma, siteId);
  return res.json({ ok: true });
});

router.get("/tags", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  return res.json({ tags: await listAdminWorkTags(prisma, siteId) });
});

router.post("/tags", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsed = tagCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const result = await createAdminWorkTag(prisma, { siteId, ...parsed.data });
  if (result.type === "conflict") {
    return res.status(409).json({
      ok: false,
      error: { message: "Tag slug already exists. Choose a different slug." },
    });
  }

  return res.status(201).json({ tag: result.tag });
});

router.patch("/tags/:id", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
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

  const result = await updateAdminWorkTag(prisma, {
    siteId,
    id: parsedId.data.id,
    ...parsed.data,
  });

  if (result.type === "not_found") {
    return res.status(404).json({ ok: false, error: { message: "Tag not found." } });
  }

  if (result.type === "conflict") {
    return res.status(409).json({
      ok: false,
      error: { message: "Tag slug already exists. Choose a different slug." },
    });
  }

  return res.json({ tag: result.tag });
});

router.delete("/tags/:id", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedId = paramsIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid tag id." } });
  }

  const result = await deleteAdminWorkTag(prisma, {
    siteId,
    id: parsedId.data.id,
  });

  if (result.type === "not_found") {
    return res.status(404).json({ ok: false, error: { message: "Tag not found." } });
  }

  if (result.type === "in_use") {
    return res.status(409).json({
      ok: false,
      error: { message: "Tag is in use by one or more projects and cannot be deleted." },
    });
  }

  return res.json({ ok: true });
});

router.get("/projects", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  return res.json({ projects: await listAdminWorkProjects(prisma, siteId) });
});

router.get("/projects/:id", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedId = paramsIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid project id." } });
  }

  const project = await getAdminWorkProject(prisma, {
    siteId,
    id: parsedId.data.id,
  });
  if (!project) {
    return res.status(404).json({ ok: false, error: { message: "Project not found." } });
  }

  return res.json({ project });
});

router.post("/projects", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsed = projectCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const result = await createAdminWorkProject(prisma, { siteId, ...parsed.data });
  if (result.type === "invalid_tags") {
    return res.status(400).json({
      ok: false,
      error: { message: "One or more selected tags are invalid." },
    });
  }

  if (result.type === "conflict") {
    return res.status(409).json({
      ok: false,
      error: { message: "A project with this slug already exists. Choose a unique slug." },
    });
  }

  return res.status(201).json({ project: result.project });
});

router.put("/projects/:id", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
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

  const result = await updateAdminWorkProject(prisma, {
    siteId,
    id: parsedId.data.id,
    ...parsed.data,
  });

  if (result.type === "not_found") {
    return res.status(404).json({ ok: false, error: { message: "Project not found." } });
  }

  if (result.type === "invalid_tags") {
    return res.status(400).json({
      ok: false,
      error: { message: "One or more selected tags are invalid." },
    });
  }

  if (result.type === "conflict") {
    return res.status(409).json({
      ok: false,
      error: { message: "A project with this slug already exists. Choose a unique slug." },
    });
  }

  return res.json({ project: result.project });
});

router.post("/projects/:id/publish", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedId = paramsIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid project id." } });
  }

  const result = await publishAdminWorkProject(prisma, {
    siteId,
    id: parsedId.data.id,
  });

  if (result.type === "not_found") {
    return res.status(404).json({ ok: false, error: { message: "Project not found." } });
  }

  if (result.type === "invalid_tags") {
    return res.status(400).json({
      ok: false,
      error: { message: "Project must have at least one tag before publishing." },
    });
  }

  if (result.type === "publish_conflict") {
    return res.status(409).json({
      ok: false,
      error: {
        message:
          "Cannot publish because this slug is already used by another published project.",
      },
    });
  }

  return res.json({ ok: true });
});

router.post("/projects/:id/duplicate", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedId = paramsIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid project id." } });
  }

  const result = await duplicateAdminWorkProject(prisma, {
    siteId,
    id: parsedId.data.id,
  });

  if (result.type === "not_found") {
    return res.status(404).json({ ok: false, error: { message: "Project not found." } });
  }

  if (result.type === "invalid_tags") {
    return res.status(400).json({
      ok: false,
      error: { message: "Cannot duplicate a project without at least one tag." },
    });
  }

  if (result.type === "conflict") {
    return res.status(409).json({
      ok: false,
      error: { message: "Unable to create duplicate with a unique slug." },
    });
  }

  return res.status(201).json({ project: result.project });
});

export default router;
