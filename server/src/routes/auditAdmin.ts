import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import { listRecentAuditLogs } from "../services/auditAdmin";

const router = Router();

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  action: z.string().trim().min(1).optional(),
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

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid query." },
    });
  }

  const entries = await listRecentAuditLogs(prisma, {
    siteId,
    limit: parsed.data.limit,
    action: parsed.data.action ?? null,
  });

  return res.json({ ok: true, entries });
});

export default router;
