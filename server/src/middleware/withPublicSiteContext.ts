import type { NextFunction, Request, Response } from "express";

import { prisma } from "../db/prisma";
import { resolvePublicSiteContext } from "../services/siteContext";

function readSiteSlugFromQuery(req: Request): string | null {
  const value = req.query.site;
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function withPublicSiteContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const headerSiteSlug = req.header("x-site-slug")?.trim() || null;
    const querySiteSlug = readSiteSlugFromQuery(req);
    const hostname = req.get("host") ?? req.hostname ?? "";

    const context = await resolvePublicSiteContext(prisma, {
      hostname,
      querySiteSlug,
      headerSiteSlug,
    });

    req.context = {
      tenantId: context.tenantId,
      tenantSlug: context.tenantSlug,
      siteId: context.siteId,
      siteSlug: context.siteSlug,
    };

    return next();
  } catch {
    return res.status(404).json({
      ok: false,
      error: { message: "Site not found." },
    });
  }
}
