import { Prisma } from "@prisma/client";
import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import {
  createAdminSite,
  getAdminSiteDetail,
  listAdminSites,
} from "../services/sitesAdmin";

const router = Router();

const paramsSchema = z.object({
  siteId: z.string().min(1),
});

const createSiteSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens."),
  templateKey: z.string().min(1).optional(),
  templateVersion: z.string().min(1).optional(),
});

function getTenantId(req: Request, res: Response) {
  const tenantId = req.context?.tenantId;
  if (!tenantId) {
    res.status(500).json({
      ok: false,
      error: { message: "Missing admin tenant context." },
    });
    return null;
  }

  return tenantId;
}

router.use(requireAdmin, withAdminSiteContext);

router.get("/", async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const sites = await listAdminSites(prisma, tenantId);
  return res.json({ ok: true, sites });
});

router.get("/:siteId", async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid site id." },
    });
  }

  const site = await getAdminSiteDetail(prisma, {
    tenantId,
    siteId: parsed.data.siteId,
  });

  if (!site) {
    return res.status(404).json({
      ok: false,
      error: { message: "Site not found." },
    });
  }

  return res.json({ ok: true, site });
});

router.post("/", async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const parsed = createSiteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  try {
    const site = await createAdminSite(prisma, {
      tenantId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      templateKey: parsed.data.templateKey ?? null,
      templateVersion: parsed.data.templateVersion ?? null,
    });

    if (!site) {
      return res.status(500).json({
        ok: false,
        error: { message: "Failed to load created site." },
      });
    }

    return res.status(201).json({ ok: true, site });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        ok: false,
        error: { message: "Site slug already exists for this tenant." },
      });
    }

    return res.status(500).json({
      ok: false,
      error: {
        message:
          error instanceof Error ? error.message : "Unable to create site.",
      },
    });
  }
});

export default router;
