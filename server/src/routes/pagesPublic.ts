import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { withPublicSiteContext } from "../middleware/withPublicSiteContext";
import { getPublishedPage } from "../services/pagePublic";

const router = Router();

const paramsSchema = z.object({
  pageKey: z.string().min(1),
});

router.use(withPublicSiteContext);

router.get("/:pageKey", async (req, res) => {
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing public site context." },
    });
  }

  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid page key." },
    });
  }

  const page = await getPublishedPage(prisma, {
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

export default router;
