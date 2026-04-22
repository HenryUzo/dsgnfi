import { Router, type Request, type Response } from "express";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import {
  getProcessDraftForAdmin,
  publishProcessForAdmin,
  saveProcessDraftForAdmin,
} from "../services/processCompatibility";

const router = Router();

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
  const adminId = req.admin?.id ?? null;
  if (adminId === null && !req.admin) {
    res.status(401).json({
      ok: false,
      error: { message: "Unauthorized" },
    });
    return null;
  }

  return adminId;
}

function getValidationMessage(error: { issues?: Array<{ message?: string }> }) {
  return error.issues?.[0]?.message ?? "Invalid payload.";
}

router.use(requireAdmin, withAdminSiteContext);

router.get("/content", async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || adminId === null) return;

  const payload = await getProcessDraftForAdmin(prisma, { siteId, adminId });
  return res.json(payload);
});

router.put("/content", async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || adminId === null) return;

  const result = await saveProcessDraftForAdmin(prisma, {
    siteId,
    adminId,
    payload: req.body,
  });

  if (result.type === "validation_error") {
    return res.status(400).json({
      ok: false,
      error: { message: getValidationMessage(result.error) },
    });
  }

  return res.json({ ok: true, data: result.page.data });
});

router.post("/content/publish", async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || adminId === null) return;

  const result = await publishProcessForAdmin(prisma, { siteId, adminId });

  if (result.type === "validation_error") {
    return res.status(400).json({
      ok: false,
      error: { message: getValidationMessage(result.error) },
    });
  }

  return res.json({ ok: true, data: result.data });
});

export default router;
