import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import {
  createPreviewToken,
  getPreviewBaseUrl,
  listPreviewTokens,
  revokePreviewToken,
} from "../services/previewTokens";

const router = Router();

const createSchema = z.object({
  pageKey: z.string().trim().min(1).optional().nullable(),
  note: z.string().trim().max(160).optional().nullable(),
  expiresInMinutes: z.number().int().min(5).max(1440).optional(),
});

const paramsSchema = z.object({
  tokenId: z.string().min(1),
});

function getSiteId(req: Request, res: Response) {
  const siteId = req.context?.siteId;
  if (!siteId) {
    res.status(500).json({ ok: false, error: { message: "Missing admin site context." } });
    return null;
  }
  return siteId;
}

function getAdminId(req: Request, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    return null;
  }
  return adminId;
}

router.use(requireAdmin, withAdminSiteContext);

router.get("/", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const tokens = await listPreviewTokens(prisma, siteId);
  return res.json({ ok: true, tokens });
});

router.post("/token", async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = createSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const result = await createPreviewToken(prisma, {
    siteId,
    adminId,
    pageKey: parsed.data.pageKey,
    note: parsed.data.note,
    expiresInMinutes: parsed.data.expiresInMinutes,
    baseUrl: getPreviewBaseUrl(req),
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  return res.status(201).json({ ok: true, token: result.token });
});

router.delete("/:tokenId", async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid token id." },
    });
  }

  const revoked = await revokePreviewToken(prisma, {
    siteId,
    tokenId: parsed.data.tokenId,
    adminId,
  });

  if (!revoked) {
    return res.status(404).json({
      ok: false,
      error: { message: "Preview token not found." },
    });
  }

  return res.status(204).send();
});

export default router;
