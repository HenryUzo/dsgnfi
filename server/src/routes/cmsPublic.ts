import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";

const router = Router();

const querySchema = z.object({
  page: z.string().min(1),
  section: z.string().min(1),
});

router.get("/section", async (req, res) => {
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
    where: { page_section: { page, section } },
  });

  const isPublished = record?.status === "PUBLISHED";

  return res.json({
    page,
    section,
    data: isPublished ? record?.publishedData ?? null : null,
  });
});

export default router;
