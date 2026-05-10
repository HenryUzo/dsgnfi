import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireRole } from "../middleware/requireRole";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import {
  getAdminSiteSettings,
  updateAdminSiteNavigation,
  updateAdminSiteSettings,
} from "../services/siteSettingsAdmin";
import { validateNavigationItems } from "../services/sitePresentation";

const router = Router();

const socialLinksSchema = z.record(z.string(), z.string().url()).default({});
const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Theme colors must be valid hex values.");

const themeSchema = z
  .object({
    primaryColor: hexColorSchema.optional(),
    accentColor: hexColorSchema.optional(),
    backgroundColor: hexColorSchema.optional(),
    textColor: hexColorSchema.optional(),
    buttonRadius: z.number().min(0).max(48).optional(),
  })
  .default({});

const settingsSchema = z.object({
  siteName: z.string().trim().min(1, "Site name is required."),
  logoUrl: z.string().url().nullable(),
  faviconUrl: z.string().url().nullable(),
  tagline: z.string().trim().max(240).nullable(),
  contactEmail: z.string().email().nullable(),
  contactPhone: z.string().trim().max(80).nullable(),
  address: z.string().trim().max(300).nullable(),
  socialLinks: socialLinksSchema,
  seoTitle: z.string().trim().max(120).nullable(),
  seoDescription: z.string().trim().max(240).nullable(),
  locale: z.string().trim().max(32).nullable(),
  timezone: z.string().trim().max(64).nullable(),
  theme: themeSchema,
});

const navigationItemSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().trim().min(1, "Navigation labels are required."),
    pageKey: z.string().trim().min(1).nullable().optional(),
    href: z
      .string()
      .trim()
      .min(1)
      .refine(
        (value) => value.startsWith("/") || /^https?:\/\//.test(value),
        "Navigation href must start with / or http."
      )
      .nullable()
      .optional(),
    visible: z.boolean().optional().default(true),
    order: z.number().int().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.pageKey && !value.href) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Navigation items require a page reference or href.",
      });
    }
  });

const navigationSchema = z.object({
  primaryNavigation: z.array(navigationItemSchema),
  footerNavigation: z.array(navigationItemSchema),
});

function getSiteId(req: Request, res: Response) {
  const siteId = req.context?.siteId;
  if (!siteId) {
    res.status(500).json({
      ok: false,
      error: { message: "Missing admin site context." },
    });
    return null;
  }

  return siteId;
}

function getAdminId(req: Request, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({
      ok: false,
      error: { message: "Unauthorized" },
    });
    return null;
  }

  return adminId;
}

router.use(requireAdmin, withAdminSiteContext);

router.get("/", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const site = await getAdminSiteSettings(prisma, siteId);
  return res.json({ ok: true, site });
});

router.patch("/", requireRole(["OWNER", "ADMIN"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const site = await updateAdminSiteSettings(prisma, {
    siteId,
    adminId,
    payload: parsed.data,
  });

  return res.json({ ok: true, site });
});

router.get("/navigation", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const site = await getAdminSiteSettings(prisma, siteId);
  return res.json({
    ok: true,
    navigation: site?.navigation ?? { primary: [], footer: [] },
  });
});

router.patch("/navigation", requireRole(["OWNER", "ADMIN"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = navigationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const primaryValidation = await validateNavigationItems(prisma, {
    siteId,
    items: parsed.data.primaryNavigation,
  });
  if (!primaryValidation.ok) {
    return res.status(400).json({
      ok: false,
      error: { message: primaryValidation.message },
    });
  }

  const footerValidation = await validateNavigationItems(prisma, {
    siteId,
    items: parsed.data.footerNavigation,
  });
  if (!footerValidation.ok) {
    return res.status(400).json({
      ok: false,
      error: { message: footerValidation.message },
    });
  }

  const site = await updateAdminSiteNavigation(prisma, {
    siteId,
    adminId,
    payload: {
      primaryNavigation: primaryValidation.items,
      footerNavigation: footerValidation.items,
    },
  });

  return res.json({
    ok: true,
    navigation: site?.navigation ?? { primary: [], footer: [] },
  });
});

export default router;
