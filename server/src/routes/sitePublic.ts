import { Router, type Response } from "express";

import { prisma } from "../db/prisma";
import { withPublicSiteContext } from "../middleware/withPublicSiteContext";
import { getSitePresentation, toPublicSiteResponse } from "../services/sitePresentation";

const router = Router();

router.use(withPublicSiteContext);

async function loadPresentation(siteId: string) {
  return getSitePresentation(prisma, siteId);
}

function getSiteIdOrNotFound(
  siteId: string | undefined,
  res: Response
) {
  if (siteId) {
    return siteId;
  }

  res.status(404).json({
    ok: false,
    error: { message: "Site not found." },
  });
  return null;
}

router.get("/", async (req, res) => {
  const siteId = getSiteIdOrNotFound(req.context?.siteId, res);
  if (!siteId) return;

  const presentation = await loadPresentation(siteId);
  const payload = toPublicSiteResponse(presentation);
  if (!payload) {
    return res.status(404).json({
      ok: false,
      error: { message: "Site not found." },
    });
  }

  return res.json({
    ok: true,
    site: payload.site,
    settings: payload.settings,
    theme: payload.theme,
    pages: payload.pages,
    navigation: payload.navigation,
  });
});

router.get("/settings", async (req, res) => {
  const siteId = getSiteIdOrNotFound(req.context?.siteId, res);
  if (!siteId) return;

  const site = await loadPresentation(siteId);
  return res.json({
    ok: true,
    settings: site?.settings ?? {
      siteName: "",
      logoUrl: null,
      faviconUrl: null,
      tagline: null,
      contactEmail: null,
      contactPhone: null,
      address: null,
      socialLinks: {},
      seoTitle: null,
      seoDescription: null,
      locale: null,
      timezone: null,
    },
  });
});

router.get("/theme", async (req, res) => {
  const siteId = getSiteIdOrNotFound(req.context?.siteId, res);
  if (!siteId) return;

  const site = await loadPresentation(siteId);
  return res.json({
    ok: true,
    theme: site?.theme ?? {},
  });
});

router.get("/navigation", async (req, res) => {
  const siteId = getSiteIdOrNotFound(req.context?.siteId, res);
  if (!siteId) return;

  const site = await loadPresentation(siteId);
  return res.json({
    ok: true,
    navigation: site?.navigation ?? { primary: [], footer: [] },
  });
});

export default router;
