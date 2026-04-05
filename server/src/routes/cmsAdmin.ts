import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";

const router = Router();

/**
 * Zod JSON schema that matches Prisma's InputJsonValue / InputJsonObject.
 * - Allows: string/number/boolean/array/object
 * - Disallows: top-level null/undefined (keeps CMS data as objects)
 */
const JsonValue: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(JsonValue),
    z.record(z.string(), JsonValue),
  ])
);

const JsonObject: z.ZodType<Prisma.InputJsonObject> = z.record(
  z.string(),
  JsonValue
);

const querySchema = z.object({
  page: z.string().min(1),
  section: z.string().min(1),
});

const draftSchema = z.object({
  page: z.string().min(1),
  section: z.string().min(1),
  draftData: JsonObject,
});

const publishSchema = z.object({
  page: z.string().min(1),
  section: z.string().min(1),
});

router.use(requireAdmin, withAdminSiteContext);

router.get("/section", async (req, res) => {
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing admin site context." },
    });
  }

  const parsed = querySchema.safeParse({
    page: req.query.page,
    section: req.query.section,
  });

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: parsed.error.flatten(),
    });
  }

  const { page, section } = parsed.data;

  const record = await prisma.cmsSection.findUnique({
    where: { siteId_page_section: { siteId, page, section } },
  });

  if (!record) {
    return res.json({
      ok: true,
      page,
      section,
      draftData: {},
      publishedData: {},
      status: "DRAFT",
      publishedAt: null,
    });
  }

  return res.json({
    ok: true,
    page: record.page,
    section: record.section,
    draftData: record.draftData,
    publishedData: record.publishedData,
    status: record.status,
    publishedAt: record.publishedAt,
  });
});

router.put("/section", async (req, res) => {
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing admin site context." },
    });
  }

  const parsed = draftSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: parsed.error.flatten(),
    });
  }

  const { page, section, draftData } = parsed.data;

  await prisma.cmsSection.upsert({
    where: { siteId_page_section: { siteId, page, section } },
    update: {
      draftData,
      status: "DRAFT",
    },
    create: {
      siteId,
      page,
      section,
      draftData,
      publishedData: {}, // important for Prisma JSON typing + sane defaults
      status: "DRAFT",
    },
  });

  return res.json({ ok: true });
});

router.post("/publish", async (req, res) => {
  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing admin site context." },
    });
  }

  const parsed = publishSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: parsed.error.flatten(),
    });
  }

  const { page, section } = parsed.data;

  const record = await prisma.cmsSection.findUnique({
    where: { siteId_page_section: { siteId, page, section } },
  });

  if (!record) {
    return res.status(404).json({
      ok: false,
      error: { message: "Section not found" },
    });
  }

  // Prisma 7 JSON typing: ensure we publish an object (never null)
  const draft = (record.draftData ?? {}) as Prisma.InputJsonObject;

  await prisma.cmsSection.update({
    where: { siteId_page_section: { siteId, page, section } },
    data: {
      publishedData: draft,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  return res.json({ ok: true });
});

export default router;
