import type { MembershipRole, PrismaClient, SiteStatus } from "@prisma/client";

import { env } from "../config/env";

type SiteWithTenant = {
  id: string;
  tenantId: string;
  slug: string;
  status: SiteStatus;
  isDefault: boolean;
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
};

type AdminContextResolution = {
  tenantId: string;
  tenantSlug: string;
  siteId: string;
  siteSlug: string;
  membershipRole: MembershipRole;
};

type PublicContextResolution = {
  tenantId: string;
  tenantSlug: string;
  siteId: string;
  siteSlug: string;
};

function normalizeHost(hostname: string): string {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized) return "";
  if (normalized.startsWith("[")) return normalized;
  return normalized.split(":")[0] ?? normalized;
}

function resolveDevSubdomainSlug(hostname: string): string | null {
  const normalized = normalizeHost(hostname);
  if (!normalized.endsWith(".localhost")) return null;
  const parts = normalized.split(".");
  if (parts.length < 2) return null;
  if (parts[0] === "localhost") return null;
  return parts[0] ?? null;
}

async function findDefaultSiteForTenant(
  prisma: PrismaClient,
  tenantId: string
): Promise<SiteWithTenant | null> {
  const defaultSite = await prisma.site.findFirst({
    where: {
      tenantId,
      isDefault: true,
      status: { not: "ARCHIVED" },
    },
    include: { tenant: true },
    orderBy: { updatedAt: "desc" },
  });

  if (defaultSite) return defaultSite;

  return prisma.site.findFirst({
    where: {
      tenantId,
      status: { not: "ARCHIVED" },
    },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });
}

async function resolveSiteById(
  prisma: PrismaClient,
  siteId: string,
  userId: string
): Promise<AdminContextResolution | null> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { tenant: true },
  });

  if (!site || site.status === "ARCHIVED") {
    return null;
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      tenantId: site.tenantId,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    tenantId: site.tenantId,
    tenantSlug: site.tenant.slug,
    siteId: site.id,
    siteSlug: site.slug,
    membershipRole: membership.role,
  };
}

export async function resolveAuthorizedAdminSiteById(
  prisma: PrismaClient,
  options: {
    adminId: string;
    siteId: string;
  }
): Promise<AdminContextResolution | null> {
  return resolveSiteById(prisma, options.siteId, options.adminId);
}

export async function resolveAdminSiteContext(
  prisma: PrismaClient,
  options: {
    adminId: string;
    tokenTenantId?: string | null;
    tokenSiteId?: string | null;
    headerSiteId?: string | null;
  }
): Promise<AdminContextResolution> {
  const memberships = await prisma.membership.findMany({
    where: { userId: options.adminId },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    throw new Error("No tenant membership found for admin user.");
  }

  if (options.tokenSiteId) {
    const byTokenSite = await resolveSiteById(prisma, options.tokenSiteId, options.adminId);
    if (byTokenSite) {
      return byTokenSite;
    }
  }

  if (options.headerSiteId && env.NODE_ENV !== "production") {
    const byHeaderSite = await resolveSiteById(prisma, options.headerSiteId, options.adminId);
    if (byHeaderSite) {
      return byHeaderSite;
    }
  }

  const selectedMembership =
    (options.tokenTenantId
      ? memberships.find((membership) => membership.tenantId === options.tokenTenantId)
      : null) ?? memberships[0];

  if (!selectedMembership) {
    throw new Error("No tenant membership found for admin user.");
  }

  const defaultSite = await findDefaultSiteForTenant(prisma, selectedMembership.tenantId);
  if (!defaultSite) {
    throw new Error("No site found for admin membership tenant.");
  }

  return {
    tenantId: defaultSite.tenantId,
    tenantSlug: defaultSite.tenant.slug,
    siteId: defaultSite.id,
    siteSlug: defaultSite.slug,
    membershipRole: selectedMembership.role,
  };
}

export async function resolvePublicSiteContext(
  prisma: PrismaClient,
  options: {
    hostname: string;
    querySiteSlug?: string | null;
    headerSiteSlug?: string | null;
  }
): Promise<PublicContextResolution> {
  const host = normalizeHost(options.hostname);

  if (host) {
    const domainMatch = await prisma.siteDomain.findFirst({
      where: { hostname: host },
      include: { site: { include: { tenant: true } } },
    });

    if (domainMatch && domainMatch.site.status !== "ARCHIVED") {
      return {
        tenantId: domainMatch.site.tenantId,
        tenantSlug: domainMatch.site.tenant.slug,
        siteId: domainMatch.site.id,
        siteSlug: domainMatch.site.slug,
      };
    }
  }

  const localhostSiteSlug = resolveDevSubdomainSlug(host);
  if (localhostSiteSlug) {
    const localhostSite = await prisma.site.findFirst({
      where: {
        slug: localhostSiteSlug,
        status: { not: "ARCHIVED" },
      },
      include: { tenant: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    if (localhostSite) {
      return {
        tenantId: localhostSite.tenantId,
        tenantSlug: localhostSite.tenant.slug,
        siteId: localhostSite.id,
        siteSlug: localhostSite.slug,
      };
    }
  }

  const devOverrideAllowed =
    env.NODE_ENV !== "production" && env.ALLOW_DEV_SITE_QUERY_OVERRIDE;
  const devOverrideSlug = (options.headerSiteSlug || options.querySiteSlug || "").trim();
  if (devOverrideAllowed && devOverrideSlug) {
    const overrideSite = await prisma.site.findFirst({
      where: {
        slug: devOverrideSlug,
        status: { not: "ARCHIVED" },
      },
      include: { tenant: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    if (overrideSite) {
      return {
        tenantId: overrideSite.tenantId,
        tenantSlug: overrideSite.tenant.slug,
        siteId: overrideSite.id,
        siteSlug: overrideSite.slug,
      };
    }
  }

  const configuredDefaultSite = await prisma.site.findFirst({
    where: {
      slug: env.DEFAULT_SITE_SLUG,
      status: { not: "ARCHIVED" },
      tenant: { slug: env.DEFAULT_TENANT_SLUG },
    },
    include: { tenant: true },
  });

  if (configuredDefaultSite) {
    return {
      tenantId: configuredDefaultSite.tenantId,
      tenantSlug: configuredDefaultSite.tenant.slug,
      siteId: configuredDefaultSite.id,
      siteSlug: configuredDefaultSite.slug,
    };
  }

  const fallbackDefaultSite = await prisma.site.findFirst({
    where: {
      isDefault: true,
      status: { not: "ARCHIVED" },
    },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });

  if (fallbackDefaultSite) {
    return {
      tenantId: fallbackDefaultSite.tenantId,
      tenantSlug: fallbackDefaultSite.tenant.slug,
      siteId: fallbackDefaultSite.id,
      siteSlug: fallbackDefaultSite.slug,
    };
  }

  throw new Error("No public site could be resolved.");
}
