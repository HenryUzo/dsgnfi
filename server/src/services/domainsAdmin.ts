import { resolveTxt } from "node:dns/promises";
import crypto from "crypto";

import type {
  DomainVerificationStatus,
  Prisma,
  PrismaClient,
  SiteDomainType,
} from "@prisma/client";

import { env } from "../config/env";
import { writeAuditLog } from "./auditLog";

const hostnameRegex =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const subdomainLabelRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export type DomainListItem = {
  id: string;
  hostname: string;
  type: SiteDomainType;
  isPrimary: boolean;
  verificationStatus: DomainVerificationStatus;
  verifiedAt: Date | null;
  verificationInstructions: {
    host: string;
    type: "TXT";
    value: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

function toDomainItem(domain: {
  id: string;
  hostname: string;
  type: SiteDomainType;
  isPrimary: boolean;
  verificationStatus: DomainVerificationStatus;
  verifiedAt: Date | null;
  verificationHost: string | null;
  verificationValue: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DomainListItem {
  return {
    id: domain.id,
    hostname: domain.hostname,
    type: domain.type,
    isPrimary: domain.isPrimary,
    verificationStatus: domain.verificationStatus,
    verifiedAt: domain.verifiedAt,
    verificationInstructions:
      domain.verificationHost && domain.verificationValue
        ? {
            host: domain.verificationHost,
            type: "TXT",
            value: domain.verificationValue,
          }
        : null,
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
  };
}

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function buildVerificationHost(hostname: string) {
  return `_dsgnfi-verification.${hostname}`;
}

function buildVerificationValue() {
  return `dsgnfi-${crypto.randomBytes(16).toString("hex")}`;
}

async function hasPrimaryDomain(prisma: PrismaClient, siteId: string) {
  const existingPrimary = await prisma.siteDomain.findFirst({
    where: { siteId, isPrimary: true },
    select: { id: true },
  });

  return Boolean(existingPrimary);
}

export async function listDomains(prisma: PrismaClient, siteId: string) {
  const domains = await prisma.siteDomain.findMany({
    where: { siteId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  return domains.map(toDomainItem);
}

export async function createDomain(
  prisma: PrismaClient,
  options:
    | { siteId: string; adminId?: string | null; type: "SUBDOMAIN"; subdomainLabel: string }
    | { siteId: string; adminId?: string | null; type: "CUSTOM"; hostname: string }
) {
  if (options.type === "SUBDOMAIN") {
    const baseDomain = env.APP_BASE_DOMAIN?.trim().toLowerCase();
    if (!baseDomain) {
      return { type: "invalid" as const, message: "APP_BASE_DOMAIN is not configured." };
    }

    const label = options.subdomainLabel.trim().toLowerCase();
    if (!subdomainLabelRegex.test(label)) {
      return { type: "invalid" as const, message: "Subdomain label is invalid." };
    }

    const hostname = `${label}.${baseDomain}`;
    const existingPrimary = await hasPrimaryDomain(prisma, options.siteId);

    try {
      const domain = await prisma.siteDomain.create({
        data: {
          siteId: options.siteId,
          hostname,
          type: "SUBDOMAIN",
          isPrimary: !existingPrimary,
          verificationStatus: "VERIFIED",
          verifiedAt: new Date(),
        },
      });

      await writeAuditLog(prisma, {
        actorAdminUserId: options.adminId ?? null,
        siteId: options.siteId,
        action: "domain.created",
        entityType: "site_domain",
        entityId: domain.id,
        metadata: {
          hostname: domain.hostname,
          type: domain.type,
          verificationStatus: domain.verificationStatus,
          isPrimary: domain.isPrimary,
        },
      });

      return { type: "success" as const, domain: toDomainItem(domain) };
    } catch (error) {
      if ((error as Prisma.PrismaClientKnownRequestError).code === "P2002") {
        return { type: "conflict" as const, message: "Hostname already exists." };
      }
      throw error;
    }
  }

  const hostname = normalizeHostname(options.hostname);
  if (!hostnameRegex.test(hostname)) {
    return { type: "invalid" as const, message: "Hostname is invalid." };
  }

  const verificationHost = buildVerificationHost(hostname);
  const verificationValue = buildVerificationValue();

  try {
    const domain = await prisma.siteDomain.create({
      data: {
        siteId: options.siteId,
        hostname,
        type: "CUSTOM",
        isPrimary: false,
        verificationStatus: "PENDING",
        verificationHost,
        verificationValue,
      },
    });

    await writeAuditLog(prisma, {
      actorAdminUserId: options.adminId ?? null,
      siteId: options.siteId,
      action: "domain.created",
      entityType: "site_domain",
      entityId: domain.id,
      metadata: {
        hostname: domain.hostname,
        type: domain.type,
        verificationStatus: domain.verificationStatus,
        verificationHost: domain.verificationHost,
      },
    });

    return { type: "success" as const, domain: toDomainItem(domain) };
  } catch (error) {
    if ((error as Prisma.PrismaClientKnownRequestError).code === "P2002") {
      return { type: "conflict" as const, message: "Hostname already exists." };
    }
    throw error;
  }
}

export async function verifyDomain(
  prisma: PrismaClient,
  options: { siteId: string; domainId: string; adminId?: string | null }
) {
  const domain = await prisma.siteDomain.findFirst({
    where: {
      id: options.domainId,
      siteId: options.siteId,
    },
  });

  if (!domain) {
    return { type: "not_found" as const };
  }

  if (domain.type === "SUBDOMAIN") {
    await writeAuditLog(prisma, {
      actorAdminUserId: options.adminId ?? null,
      siteId: options.siteId,
      action: "domain.verified",
      entityType: "site_domain",
      entityId: domain.id,
      metadata: {
        hostname: domain.hostname,
        type: domain.type,
        verificationStatus: domain.verificationStatus,
        result: "already_verified_subdomain",
      },
    });

    return { type: "success" as const, domain: toDomainItem(domain) };
  }

  const verificationHost = domain.verificationHost;
  const verificationValue = domain.verificationValue;
  if (!verificationHost || !verificationValue) {
    const failed = await prisma.siteDomain.update({
      where: { id: domain.id },
      data: {
        verificationStatus: "FAILED",
        lastVerificationAttemptAt: new Date(),
        lastVerificationError: "Verification instructions are missing.",
      },
    });
    await writeAuditLog(prisma, {
      actorAdminUserId: options.adminId ?? null,
      siteId: options.siteId,
      action: "domain.verification_attempted",
      entityType: "site_domain",
      entityId: failed.id,
      metadata: {
        hostname: failed.hostname,
        result: "failed",
        error: failed.lastVerificationError,
      },
    });
    return { type: "success" as const, domain: toDomainItem(failed) };
  }

  try {
    const records = await resolveTxt(verificationHost);
    const values = records.flat().map((value) => value.trim());
    const matched = values.includes(verificationValue);

    const updated = await prisma.siteDomain.update({
      where: { id: domain.id },
      data: matched
        ? {
            verificationStatus: "VERIFIED",
            verifiedAt: new Date(),
            lastVerificationAttemptAt: new Date(),
            lastVerificationError: null,
          }
        : {
            verificationStatus: "FAILED",
            lastVerificationAttemptAt: new Date(),
            lastVerificationError: "Expected TXT verification record was not found.",
          },
    });

    await writeAuditLog(prisma, {
      actorAdminUserId: options.adminId ?? null,
      siteId: options.siteId,
      action: "domain.verification_attempted",
      entityType: "site_domain",
      entityId: updated.id,
      metadata: {
        hostname: updated.hostname,
        result: matched ? "verified" : "failed",
        error: updated.lastVerificationError,
      },
    });
    return { type: "success" as const, domain: toDomainItem(updated) };
  } catch (error) {
    const updated = await prisma.siteDomain.update({
      where: { id: domain.id },
      data: {
        verificationStatus: "FAILED",
        lastVerificationAttemptAt: new Date(),
        lastVerificationError:
          error instanceof Error ? error.message : "DNS verification failed.",
      },
    });
    await writeAuditLog(prisma, {
      actorAdminUserId: options.adminId ?? null,
      siteId: options.siteId,
      action: "domain.verification_attempted",
      entityType: "site_domain",
      entityId: updated.id,
      metadata: {
        hostname: updated.hostname,
        result: "failed",
        error: updated.lastVerificationError,
      },
    });
    return { type: "success" as const, domain: toDomainItem(updated) };
  }
}

export async function setPrimaryDomain(
  prisma: PrismaClient,
  options: { siteId: string; domainId: string; adminId?: string | null }
) {
  const domain = await prisma.siteDomain.findFirst({
    where: {
      id: options.domainId,
      siteId: options.siteId,
    },
  });

  if (!domain) {
    return { type: "not_found" as const };
  }

  if (domain.type === "CUSTOM" && domain.verificationStatus !== "VERIFIED") {
    return {
      type: "blocked" as const,
      message: "Custom domains must be verified before they can be primary.",
    };
  }

  await prisma.$transaction([
    prisma.siteDomain.updateMany({
      where: { siteId: options.siteId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.siteDomain.update({
      where: { id: domain.id },
      data: { isPrimary: true },
    }),
  ]);

  const updated = await prisma.siteDomain.findUnique({ where: { id: domain.id } });
  await writeAuditLog(prisma, {
    actorAdminUserId: options.adminId ?? null,
    siteId: options.siteId,
    action: "domain.primary_set",
    entityType: "site_domain",
    entityId: domain.id,
    metadata: {
      hostname: updated?.hostname ?? domain.hostname,
      type: updated?.type ?? domain.type,
    },
  });
  return { type: "success" as const, domain: toDomainItem(updated!) };
}

export async function deleteDomain(
  prisma: PrismaClient,
  options: { siteId: string; domainId: string; adminId?: string | null }
) {
  const domain = await prisma.siteDomain.findFirst({
    where: {
      id: options.domainId,
      siteId: options.siteId,
    },
  });

  if (!domain) {
    return null;
  }

  await prisma.siteDomain.delete({ where: { id: domain.id } });
  await writeAuditLog(prisma, {
    actorAdminUserId: options.adminId ?? null,
    siteId: options.siteId,
    action: "domain.deleted",
    entityType: "site_domain",
    entityId: domain.id,
    metadata: {
      hostname: domain.hostname,
      type: domain.type,
      wasPrimary: domain.isPrimary,
    },
  });
  return domain;
}
