import { Router } from "express";

import { prisma } from "../db/prisma";
import { withPublicSiteContext } from "../middleware/withPublicSiteContext";
import { getPublishedProcessForPublic } from "../services/processCompatibility";

const router = Router();

router.use(withPublicSiteContext);

router.get("/content", async (req, res) => {
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing public site context." },
    });
  }

  const data = await getPublishedProcessForPublic(prisma, { siteId });

  return res.json({
    ok: true,
    data,
  });
});

export default router;
