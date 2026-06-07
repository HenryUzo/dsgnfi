import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { signToken, verifyToken } from "../auth/jwt";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  resolveAdminSiteContext,
  resolveAuthorizedAdminSiteById,
} from "../services/siteContext";

const router = Router();

router.get("/ping", (_req, res) => {
  res.json({ ok: true, route: "/auth/ping" });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const switchSiteSchema = z.object({
  siteId: z.string().min(1),
});

async function tryRepairSeedAdminPassword(options: {
  email: string;
  password: string;
  user: { id: string; email: string };
}) {
  if (env.NODE_ENV !== "development") {
    return false;
  }

  const seedEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@dsgnfi.com";
  const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow123!";

  if (options.email !== seedEmail || options.password !== seedPassword || options.user.email !== seedEmail) {
    return false;
  }

  const passwordHash = await bcrypt.hash(seedPassword, 12);
  await prisma.adminUser.update({
    where: { id: options.user.id },
    data: { passwordHash },
  });

  return true;
}

async function buildAuthPayload(
  adminId: string,
  options?: {
    tokenTenantId?: string | null;
    tokenSiteId?: string | null;
    headerSiteId?: string | null;
  }
) {
  const memberships = await prisma.membership.findMany({
    where: { userId: adminId },
    include: {
      tenant: {
        include: {
          sites: {
            where: { status: { not: "ARCHIVED" } },
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              isDefault: true,
            },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const membershipPayload = memberships.map((membership) => ({
    tenant: {
      id: membership.tenant.id,
      name: membership.tenant.name,
      slug: membership.tenant.slug,
    },
    role: membership.role,
    sites: membership.tenant.sites,
  }));

  let currentTenant: {
    id: string;
    name: string;
    slug: string;
  } | null = null;
  let currentSite: {
    id: string;
    name: string;
    slug: string;
    status: string;
    isDefault: boolean;
  } | null = null;
  let currentRole: string | null = null;

  try {
    const context = await resolveAdminSiteContext(prisma, {
      adminId,
      tokenTenantId: options?.tokenTenantId ?? null,
      tokenSiteId: options?.tokenSiteId ?? null,
      headerSiteId: options?.headerSiteId ?? null,
    });

    const activeMembership = memberships.find(
      (membership) => membership.tenantId === context.tenantId
    );

    currentTenant = activeMembership
      ? {
          id: activeMembership.tenant.id,
          name: activeMembership.tenant.name,
          slug: activeMembership.tenant.slug,
        }
      : {
          id: context.tenantId,
          name: context.tenantSlug,
          slug: context.tenantSlug,
        };

    const resolvedSite = activeMembership?.tenant.sites.find(
      (site) => site.id === context.siteId
    );

    if (resolvedSite) {
      currentSite = {
        id: resolvedSite.id,
        name: resolvedSite.name,
        slug: resolvedSite.slug,
        status: resolvedSite.status,
        isDefault: resolvedSite.isDefault,
      };
    } else {
      const fallbackSite = await prisma.site.findUnique({
        where: { id: context.siteId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          isDefault: true,
        },
      });

      if (fallbackSite) {
        currentSite = {
          id: fallbackSite.id,
          name: fallbackSite.name,
          slug: fallbackSite.slug,
          status: fallbackSite.status,
          isDefault: fallbackSite.isDefault,
        };
      }
    }

    currentRole = context.membershipRole;
  } catch {
    currentTenant = null;
    currentSite = null;
    currentRole = null;
  }

  return {
    memberships: membershipPayload,
    currentTenant,
    currentSite,
    currentRole,
  };
}

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  let user;
  try {
    user = await prisma.adminUser.findUnique({ where: { email } });
  } catch {
    return res.status(503).json({
      ok: false,
      error: {
        code: "auth_unavailable",
        message: "Authentication service is unavailable. Check database connection.",
      },
    });
  }
  if (!user) {
    return res.status(401).json({
      ok: false,
      error: { message: "Invalid credentials" },
    });
  }

  let isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const repaired = await tryRepairSeedAdminPassword({ email, password, user });
    if (repaired) {
      isValid = true;
    }
  }

  if (!isValid) {
    return res.status(401).json({
      ok: false,
      error: { message: "Invalid credentials" },
    });
  }

  let tokenTenantId: string | undefined;
  let tokenSiteId: string | undefined;

  try {
    const context = await resolveAdminSiteContext(prisma, {
      adminId: user.id,
      tokenSiteId: null,
      tokenTenantId: null,
      headerSiteId: null,
    });

    tokenTenantId = context.tenantId;
    tokenSiteId = context.siteId;
  } catch {
    // Keep login backward-compatible even if tenant/site context is unavailable.
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    tenantId: tokenTenantId,
    siteId: tokenSiteId,
  });

  res.cookie("cms_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  });

  return res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  const token = req.cookies?.cms_token as string | undefined;
  if (!token) {
    return res.status(401).json({
      ok: false,
      error: { message: "Not authenticated" },
    });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return res.status(401).json({
      ok: false,
      error: { message: "Not authenticated" },
    });
  }

  const authPayload = await buildAuthPayload(decoded.id, {
    tokenTenantId: decoded.tenantId ?? null,
    tokenSiteId: decoded.siteId ?? null,
    headerSiteId: req.header("x-site-id")?.trim() || null,
  });

  return res.json({
    ok: true,
    id: decoded.id,
    email: decoded.email,
    memberships: authPayload.memberships,
    currentTenant: authPayload.currentTenant,
    currentSite: authPayload.currentSite,
    currentRole: authPayload.currentRole,
  });
});

router.post("/switch-site", requireAdmin, async (req, res) => {
  const parsed = switchSiteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const currentContext = await resolveAdminSiteContext(prisma, {
    adminId: req.admin!.id,
    tokenTenantId: req.admin!.tenantId ?? null,
    tokenSiteId: req.admin!.siteId ?? null,
    headerSiteId: null,
  });

  const targetSiteContext = await resolveAuthorizedAdminSiteById(prisma, {
    adminId: req.admin!.id,
    siteId: parsed.data.siteId,
  });

  if (!targetSiteContext || targetSiteContext.tenantId !== currentContext.tenantId) {
    return res.status(403).json({
      ok: false,
      error: { message: "You do not have access to this site." },
    });
  }

  const token = signToken({
    id: req.admin!.id,
    email: req.admin!.email,
    tenantId: targetSiteContext.tenantId,
    siteId: targetSiteContext.siteId,
  });

  res.cookie("cms_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  });

  const authPayload = await buildAuthPayload(req.admin!.id, {
    tokenTenantId: targetSiteContext.tenantId,
    tokenSiteId: targetSiteContext.siteId,
  });

  return res.json({
    ok: true,
    currentTenant: authPayload.currentTenant,
    currentSite: authPayload.currentSite,
    currentRole: authPayload.currentRole,
  });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("cms_token", { path: "/" });
  return res.json({ ok: true });
});

export default router;
