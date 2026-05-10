import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireRole } from "../middleware/requireRole";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import {
  getAdminPageDraft,
  getAdminPageHistory,
  listAdminPages,
  publishAdminPage,
  restoreAdminPageRevision,
  saveAdminPageDraft,
} from "../services/pageAdmin";

const router = Router();

const pageParamsSchema = z.object({
  pageKey: z.string().min(1),
});

const restoreParamsSchema = z.object({
  pageKey: z.string().min(1),
  revisionId: z.string().min(1),
});

function getSiteId(req: Request, res: Response) {
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

function getAdminId(req: Request, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({
      ok: false,
      error: { message: "Unauthorized" },
    });
    return null;
  }

  return adminId;
}

function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid payload.";
}

router.use(requireAdmin, withAdminSiteContext);

router.get("/", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const pages = await listAdminPages(prisma, siteId);
  return res.json({ ok: true, pages });
});

router.get("/:pageKey/draft", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsed = pageParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid page key." },
    });
  }

  const page = await getAdminPageDraft(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
  });

  if (!page) {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  return res.json({ ok: true, page });
});

router.put("/:pageKey/draft", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = pageParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid page key." },
    });
  }

  const result = await saveAdminPageDraft(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
    adminId,
    payload: req.body,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  if (result.type === "validation_error") {
    return res.status(400).json({
      ok: false,
      error: { message: getValidationMessage(result.error) },
    });
  }

  return res.json({ ok: true, page: result.page });
});

router.post("/:pageKey/publish", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = pageParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid page key." },
    });
  }

  const result = await publishAdminPage(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
    adminId,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  if (result.type === "validation_error") {
    return res.status(400).json({
      ok: false,
      error: { message: getValidationMessage(result.error) },
    });
  }

  return res.json({ ok: true, page: result.page });
});

router.get("/:pageKey/history", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsed = pageParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid page key." },
    });
  }

  const revisions = await getAdminPageHistory(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
  });

  if (!revisions) {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  return res.json({ ok: true, revisions });
});

router.post("/:pageKey/restore/:revisionId", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = restoreParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid restore request." },
    });
  }

  const result = await restoreAdminPageRevision(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
    revisionId: parsed.data.revisionId,
    adminId,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page or revision not found." },
    });
  }

  if (result.type === "validation_error") {
    return res.status(400).json({
      ok: false,
      error: { message: getValidationMessage(result.error) },
    });
  }

  return res.json({ ok: true, page: result.page });
});

export default router;
