import crypto from "crypto";
import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireRole } from "../middleware/requireRole";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import {
  createAdminAsset,
  deleteAdminAsset,
  listAdminAssets,
  updateAdminAsset,
} from "../services/assetsAdmin";
import { putObject } from "../services/storage";
import { upload } from "./uploads";

const router = Router();

const paramsSchema = z.object({
  assetId: z.string().min(1),
});

const updateSchema = z.object({
  filename: z.string().min(1).optional(),
  altText: z.string().trim().max(240).nullable().optional(),
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

router.use(requireAdmin, withAdminSiteContext);

router.get("/", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const assets = await listAdminAssets(prisma, siteId);
  return res.json({ ok: true, assets });
});

router.post("/", requireRole(["OWNER", "ADMIN"]), upload.single("file"), async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;
  const tenantId = req.context?.tenantId;
  if (!tenantId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing admin tenant context." },
    });
  }

  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: { message: "No file uploaded." },
    });
  }

  const stored = await putObject({
    visibility: "public",
    tenantId,
    siteId,
    category: "asset",
    ownerId: crypto.randomUUID(),
    filename: req.file.originalname,
    body: req.file.buffer,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
  });
  const url = stored.publicUrl ?? `/uploads/${stored.key}`;
  const asset = await createAdminAsset(prisma, {
    siteId,
    url,
    storageProvider: stored.provider,
    storageKey: stored.key,
    bucket: stored.bucket,
    publicUrl: stored.publicUrl,
    visibility: stored.visibility,
    checksum: stored.checksum,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    altText: typeof req.body.altText === "string" ? req.body.altText : null,
  });

  return res.status(201).json({ ok: true, asset });
});

router.patch("/:assetId", requireRole(["OWNER", "ADMIN"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedParams = paramsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid asset id." },
    });
  }

  const parsedBody = updateSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsedBody.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const asset = await updateAdminAsset(prisma, {
    siteId,
    assetId: parsedParams.data.assetId,
    filename: parsedBody.data.filename,
    altText: parsedBody.data.altText ?? null,
  });

  if (!asset) {
    return res.status(404).json({
      ok: false,
      error: { message: "Asset not found." },
    });
  }

  return res.json({ ok: true, asset });
});

router.delete("/:assetId", requireRole(["OWNER", "ADMIN"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsedParams = paramsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid asset id." },
    });
  }

  const deleted = await deleteAdminAsset(prisma, {
    siteId,
    assetId: parsedParams.data.assetId,
  });

  if (!deleted) {
    return res.status(404).json({
      ok: false,
      error: { message: "Asset not found." },
    });
  }

  return res.status(204).send();
});

export default router;
