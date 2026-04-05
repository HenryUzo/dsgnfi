import { Router } from "express";

import { prisma } from "../db/prisma";
import { withPublicSiteContext } from "../middleware/withPublicSiteContext";

const router = Router();

const PAGE_KEY = "process";
const SECTION_KEY = "content";

router.use(withPublicSiteContext);

router.get("/content", async (req, res) => {
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing public site context." },
    });
  }

  const record = await prisma.cmsSection.findUnique({
    where: {
      siteId_page_section: { siteId, page: PAGE_KEY, section: SECTION_KEY },
    },
  });

  return res.json({
    ok: true,
    data: record?.status === "PUBLISHED" ? record.publishedData : null,
  });
});

export default router;
