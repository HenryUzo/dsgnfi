import type { PrismaClient } from "@prisma/client";

import { env } from "../config/env";

function isPlaceholderJwtSecret(secret: string) {
  const normalized = secret.trim().toLowerCase();
  return normalized === "dev_secret_change_me" || normalized === "replace_me";
}

export function getRuntimeConfigSummary() {
  const issues: string[] = [];

  if (!env.DATABASE_URL) {
    issues.push("DATABASE_URL is not configured.");
  }

  if (env.NODE_ENV === "production") {
    if (!env.FRONTEND_ORIGIN) {
      issues.push("FRONTEND_ORIGIN is required in production.");
    }

    if (!env.BACKEND_ORIGIN) {
      issues.push("BACKEND_ORIGIN is required in production.");
    }

    if (!env.APP_BASE_DOMAIN) {
      issues.push("APP_BASE_DOMAIN is required in production.");
    }

    if (env.ALLOW_DEV_SITE_QUERY_OVERRIDE) {
      issues.push("ALLOW_DEV_SITE_QUERY_OVERRIDE must be disabled in production.");
    }

    if (isPlaceholderJwtSecret(env.JWT_SECRET)) {
      issues.push("JWT_SECRET must not use a development placeholder in production.");
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    summary: {
      nodeEnv: env.NODE_ENV,
      frontendOriginConfigured: Boolean(env.FRONTEND_ORIGIN),
      backendOriginConfigured: Boolean(env.BACKEND_ORIGIN),
      appBaseDomainConfigured: Boolean(env.APP_BASE_DOMAIN),
      uploadsDirConfigured: Boolean(env.UPLOADS_DIR),
      allowDevSiteQueryOverride: env.ALLOW_DEV_SITE_QUERY_OVERRIDE,
      corsOriginCount: env.corsOrigins.length,
    },
  };
}

export async function getReadinessStatus(prisma: PrismaClient) {
  const config = getRuntimeConfigSummary();

  let databaseOk = false;
  let databaseError: string | null = null;
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    databaseOk = true;
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Database unavailable.";
  }

  const ok = config.ok && databaseOk;

  return {
    ok,
    service: "dsgnfi-cms-api",
    environment: env.NODE_ENV,
    checks: {
      config: config.ok ? "ok" : "failed",
      database: databaseOk ? "ok" : "failed",
    },
    issues: [...config.issues, ...(databaseError ? [`Database: ${databaseError}`] : [])],
    summary: config.summary,
  };
}
