import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { withPublicSiteContext } from "../middleware/withPublicSiteContext";
import { getPublicCmsSection } from "../services/cmsPublicCompatibility";

const router = Router();

const querySchema = z.object({
  page: z.string().min(1),
  section: z.string().min(1),
});

router.use(withPublicSiteContext);

router.get("/section", async (req, res) => {
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing public site context." },
    });
  }

  const parsed = querySchema.safeParse({
    page: req.query.page,
    section: req.query.section,
  });

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid query parameters" },
    });
  }

  const { page, section } = parsed.data;
  const data = await getPublicCmsSection(prisma, {
    siteId,
    page,
    section,
  });

  return res.json({ page, section, data });
});

export default router;
