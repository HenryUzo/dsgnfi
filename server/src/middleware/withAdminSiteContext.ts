import type { NextFunction, Request, Response } from "express";

import { prisma } from "../db/prisma";
import { resolveAdminSiteContext } from "../services/siteContext";

export async function withAdminSiteContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.admin) {
    return res.status(401).json({
      ok: false,
      error: { message: "Unauthorized" },
    });
  }

  try {
    const headerSiteId = req.header("x-site-id")?.trim() || null;

    const context = await resolveAdminSiteContext(prisma, {
      adminId: req.admin.id,
      tokenTenantId: req.admin.tenantId,
      tokenSiteId: req.admin.siteId,
      headerSiteId,
    });

    req.context = {
      user: { id: req.admin.id, email: req.admin.email },
      tenantId: context.tenantId,
      tenantSlug: context.tenantSlug,
      siteId: context.siteId,
      siteSlug: context.siteSlug,
      membershipRole: context.membershipRole,
    };

    return next();
  } catch {
    return res.status(403).json({
      ok: false,
      error: { message: "Unable to resolve admin site context." },
    });
  }
}
