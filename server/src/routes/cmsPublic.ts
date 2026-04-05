import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { withPublicSiteContext } from "../middleware/withPublicSiteContext";

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

  const record = await prisma.cmsSection.findUnique({
    where: { siteId_page_section: { siteId, page, section } },
  });

  const isPublished = record?.status === "PUBLISHED";

  return res.json({
    page,
    section,
    data: isPublished ? record?.publishedData ?? null : null,
  });
});

export default router;
