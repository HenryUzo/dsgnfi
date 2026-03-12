import { Router } from "express";

import { prisma } from "../db/prisma";

const router = Router();

const PAGE_KEY = "process";
const SECTION_KEY = "content";

router.get("/content", async (_req, res) => {
  const record = await prisma.cmsSection.findUnique({
    where: { page_section: { page: PAGE_KEY, section: SECTION_KEY } },
  });

  return res.json({
    ok: true,
    data: record?.publishedData ?? null,
  });
});

export default router;
