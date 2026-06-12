import crypto from "crypto";
import { Router } from "express";
import multer from "multer";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireRole } from "../middleware/requireRole";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import { createAdminAsset } from "../services/assetsAdmin";
import { putObject } from "../services/storage";

const router = Router();

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    if (!isImage && !isVideo) {
      cb(new Error("Only image or video files are allowed"));
      return;
    }
    cb(null, true);
  },
});

router.post("/", requireAdmin, withAdminSiteContext, requireRole(["OWNER", "ADMIN"]), upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: { message: "No file uploaded" },
    });
  }

  const siteId = req.context?.siteId;
  const tenantId = req.context?.tenantId;
  if (!siteId || !tenantId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing admin site context." },
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
  });

  return res.json({ ok: true, url, asset });
});

export default router;
