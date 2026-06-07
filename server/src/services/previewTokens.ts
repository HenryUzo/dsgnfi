import crypto from "crypto";

import type { PrismaClient } from "@prisma/client";

import { env } from "../config/env";
import { getSupportedPageForSite } from "./pageCatalog";
import { writeAuditLog } from "./auditLog";

const DEFAULT_PREVIEW_TTL_MINUTES = 60;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createRawPreviewToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export async function listPreviewTokens(prisma: PrismaClient, siteId: string) {
  const tokens = await prisma.previewToken.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
  });

  return tokens.map((token) => ({
    id: token.id,
    pageKey: token.pageKey,
    expiresAt: token.expiresAt,
    revokedAt: token.revokedAt,
    note: token.note,
    createdAt: token.createdAt,
  }));
}

export async function createPreviewToken(
  prisma: PrismaClient,
  options: {
    siteId: string;
    adminId: string;
    pageKey?: string | null;
    note?: string | null;
    expiresInMinutes?: number;
    baseUrl: string;
  }
) {
  const pageKey = options.pageKey?.trim() || null;
  if (pageKey) {
    const page = await getSupportedPageForSite(prisma, options.siteId, pageKey);
    if (!page) {
      return { type: "not_found" as const };
    }
  }

  const rawToken = createRawPreviewToken();
  const now = new Date();
  const expiresAt = addMinutes(
    now,
    Math.max(5, Math.min(options.expiresInMinutes ?? DEFAULT_PREVIEW_TTL_MINUTES, 24 * 60))
  );
  const site = await prisma.site.findUnique({
    where: { id: options.siteId },
    select: { slug: true },
  });

  const token = await prisma.previewToken.create({
    data: {
      siteId: options.siteId,
      pageKey,
      tokenHash: hashToken(rawToken),
      expiresAt,
      note: options.note?.trim() || null,
      createdBy: options.adminId,
    },
  });

  const pageSegment = pageKey ?? "home";
  const previewUrl = buildPreviewBrowserUrl(options.baseUrl, pageSegment, rawToken, site?.slug ?? null);

  await writeAuditLog(prisma, {
    actorAdminUserId: options.adminId,
    siteId: options.siteId,
    action: "preview_token.created",
    entityType: "preview_token",
      entityId: token.id,
      metadata: {
        pageKey: token.pageKey,
        expiresAt: asDate(token.expiresAt).toISOString(),
        note: token.note,
      },
    });

  return {
    type: "success" as const,
    token: {
      id: token.id,
      pageKey: token.pageKey,
      expiresAt: token.expiresAt,
      note: token.note,
      createdAt: token.createdAt,
      previewUrl,
      previewApiPath: buildPreviewApiPath(pageSegment, rawToken, site?.slug ?? null),
      token: rawToken,
    },
  };
}

export async function revokePreviewToken(
  prisma: PrismaClient,
  options: { siteId: string; tokenId: string; adminId?: string | null }
) {
  const token = await prisma.previewToken.findFirst({
    where: {
      id: options.tokenId,
      siteId: options.siteId,
    },
  });

  if (!token) {
    return null;
  }

  const revoked = await prisma.previewToken.update({
    where: { id: token.id },
    data: { revokedAt: new Date() },
  });

  await writeAuditLog(prisma, {
    actorAdminUserId: options.adminId ?? token.createdBy ?? null,
    siteId: options.siteId,
    action: "preview_token.revoked",
    entityType: "preview_token",
      entityId: token.id,
      metadata: {
        pageKey: token.pageKey,
        expiresAt: asDate(token.expiresAt).toISOString(),
      },
    });

  return revoked;
}

export async function validatePreviewToken(
  prisma: PrismaClient,
  options: {
    rawToken: string;
    pageKey: string;
  }
) {
  const token = await prisma.previewToken.findUnique({
    where: { tokenHash: hashToken(options.rawToken) },
  });

  if (!token) {
    return { type: "invalid" as const };
  }

  if (token.revokedAt) {
    return { type: "revoked" as const };
  }

  const expiresAt =
    token.expiresAt instanceof Date ? token.expiresAt : new Date(token.expiresAt);

  if (expiresAt.getTime() <= Date.now()) {
    return { type: "expired" as const };
  }

  if (token.pageKey && token.pageKey !== options.pageKey) {
    return { type: "mismatch" as const };
  }

  return {
    type: "valid" as const,
    token: {
      ...token,
      expiresAt,
    },
  };
}

function normalizeOrigin(origin: string | undefined) {
  const value = origin?.trim();
  if (!value || !/^https?:\/\//i.test(value)) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/$/, "");
  }
}

function getPreferredFrontendOrigin(
  req: { protocol: string; get(name: string): string | undefined }
) {
  const configuredFrontendOrigin = normalizeOrigin(env.FRONTEND_ORIGIN);
  if (configuredFrontendOrigin) {
    return configuredFrontendOrigin;
  }

  const requestOrigin = normalizeOrigin(req.get("origin") ?? req.get("referer"));
  if (requestOrigin) {
    return requestOrigin;
  }

  const normalizedCorsOrigins = env.corsOrigins
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
  const preferredDevOrigin = normalizedCorsOrigins.find((origin) =>
    /:\/\/(localhost|127\.0\.0\.1):5173$/i.test(origin)
  );
  if (preferredDevOrigin) {
    return preferredDevOrigin;
  }

  if (normalizedCorsOrigins[0]) {
    return normalizedCorsOrigins[0];
  }

  return null;
}

export function getPreviewBaseUrl(req: { protocol: string; get(name: string): string | undefined }) {
  const frontendOrigin = getPreferredFrontendOrigin(req);
  if (frontendOrigin) {
    return frontendOrigin;
  }

  const host = req.get("host");
  if (host) {
    return `${req.protocol}://${host}`;
  }

  const baseDomain = env.APP_BASE_DOMAIN?.trim();
  return baseDomain ? `https://${baseDomain}` : "http://localhost:5173";
}

function buildPreviewQuery(rawToken: string, siteSlug?: string | null) {
  const query = new URLSearchParams({ token: rawToken });
  const normalizedSiteSlug = siteSlug?.trim();
  if (normalizedSiteSlug && normalizedSiteSlug !== "main") {
    query.set("site", normalizedSiteSlug);
  }
  return query.toString();
}

export function buildPreviewBrowserPath(pageKey: string, rawToken: string, siteSlug?: string | null) {
  const query = buildPreviewQuery(rawToken, siteSlug);
  return `/preview/pages/${encodeURIComponent(pageKey)}?${query}`;
}

export function buildPreviewApiPath(pageKey: string, rawToken: string, siteSlug?: string | null) {
  const query = buildPreviewQuery(rawToken, siteSlug);
  return `/public/preview/pages/${encodeURIComponent(pageKey)}?${query}`;
}

export function buildPreviewBrowserUrl(baseUrl: string, pageKey: string, rawToken: string, siteSlug?: string | null) {
  return `${baseUrl}${buildPreviewBrowserPath(pageKey, rawToken, siteSlug)}`;
}
