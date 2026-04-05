import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import { getTemplateDetail, listActiveTemplates } from "../services/templateCatalog";

const router = Router();

const listQuerySchema = z.object({
  category: z.string().min(1).optional(),
});

const paramsSchema = z.object({
  templateKey: z.string().min(1),
});

router.use(requireAdmin, withAdminSiteContext);

router.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid template query." },
    });
  }

  const templates = await listActiveTemplates(prisma, {
    category: parsed.data.category ?? null,
  });

  return res.json({ ok: true, templates });
});

router.get("/:templateKey", async (req, res) => {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid template key." },
    });
  }

  const template = await getTemplateDetail(prisma, parsed.data.templateKey);
  if (!template) {
    return res.status(404).json({
      ok: false,
      error: { message: "Template not found." },
    });
  }

  return res.json({ ok: true, template });
});

export default router;
