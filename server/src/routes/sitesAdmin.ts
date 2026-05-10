import { Prisma } from "@prisma/client";
import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireRole } from "../middleware/requireRole";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import { ApiRequestError, apiError, zodApiError } from "../services/apiErrors";
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
  name: z.string().trim().min(1, "Site name is required."),
  slug: z
    .string()
    .trim()
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
      error: {
        code: "admin_tenant_context_missing",
        message: "Missing admin tenant context.",
      },
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
    return res.status(400).json(apiError("site_id_invalid", "Invalid site id."));
  }

  const site = await getAdminSiteDetail(prisma, {
    tenantId,
    siteId: parsed.data.siteId,
  });

  if (!site) {
    return res.status(404).json({
      ok: false,
      error: { code: "site_not_found", message: "Site not found." },
    });
  }

  return res.json({ ok: true, site });
});

router.post("/", requireRole(["OWNER", "ADMIN"]), async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const parsed = createSiteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(zodApiError("site_validation_failed", parsed.error));
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
        error: {
          code: "site_create_invariant_failed",
          message: "Failed to load created site.",
        },
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
        error: {
          code: "site_slug_conflict",
          message: "Site slug already exists for this tenant.",
          fieldErrors: {
            slug: ["Site slug already exists for this tenant."],
          },
        },
      });
    }

    if (error instanceof ApiRequestError) {
      return res
        .status(error.statusCode)
        .json(apiError(error.code, error.message, error.fieldErrors));
    }

    return res.status(500).json({
      ok: false,
      error: {
        code: "site_create_failed",
        message:
          error instanceof Error ? error.message : "Unable to create site.",
      },
    });
  }
});

export default router;
