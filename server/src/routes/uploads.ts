import crypto from "crypto";
import path from "path";
import { Router } from "express";
import multer from "multer";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import { createAdminAsset } from "../services/assetsAdmin";

const router = Router();

const uploadDir = path.resolve(process.cwd(), "uploads");

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    cb(null, name);
  },
});

export const upload = multer({
  storage,
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

router.post("/", requireAdmin, withAdminSiteContext, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: { message: "No file uploaded" },
    });
  }

  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing admin site context." },
    });
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;
  const asset = await createAdminAsset(prisma, {
    siteId,
    url,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });

  return res.json({ ok: true, url, asset });
});

export default router;
