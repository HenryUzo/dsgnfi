import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import fs from "fs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { runtimeDebug } from "./debug/runtimeDebug";
import authRouter from "./routes/auth";
import adminAiRouter from "./routes/adminAi";
import assetsAdminRouter from "./routes/assetsAdmin";
import auditAdminRouter from "./routes/auditAdmin";
import cmsAdminRouter from "./routes/cmsAdmin";
import cmsPublicRouter from "./routes/cmsPublic";
import contactPublicRouter from "./routes/contactPublic";
import domainsAdminRouter from "./routes/domainsAdmin";
import pagesAdminRouter from "./routes/pagesAdmin";
import pagesPublicRouter from "./routes/pagesPublic";
import processAdminRouter from "./routes/processAdmin";
import processPublicRouter from "./routes/processPublic";
import previewAdminRouter from "./routes/previewAdmin";
import previewPublicRouter from "./routes/previewPublic";
import sitePublicRouter from "./routes/sitePublic";
import siteSettingsAdminRouter from "./routes/siteSettingsAdmin";
import sitesAdminRouter from "./routes/sitesAdmin";
import templatesAdminRouter from "./routes/templatesAdmin";
import uploadsRouter from "./routes/uploads";
import workAdminRouter from "./routes/workAdmin";
import workPublicRouter from "./routes/workPublic";
import { getReadinessStatus } from "./services/runtimeStatus";
import { getUploadsDir } from "./services/uploadStorage";

export function createApp() {
  const app = express();
  const uploadsDir = getUploadsDir();
  const logger = pino();

  fs.mkdirSync(uploadsDir, { recursive: true });

  // Stop 304/ETag caching behavior for an API (prevents fetch weirdness)
  app.set("etag", false);

  app.use(express.json({ limit: "36mb" }));
  app.use(cookieParser());

  if (env.NODE_ENV === "development") {
    app.use((_req, res, next) => {
      res.setHeader("x-runtime-instance", runtimeDebug.instanceId);
      res.setHeader("x-runtime-pid", String(runtimeDebug.pid));
      res.setHeader(
        "x-runtime-jwt-secret-hash",
        runtimeDebug.jwtSecretHashPrefix
      );
      res.setHeader("x-runtime-node-env", runtimeDebug.nodeEnv);
      next();
    });
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        // allow server-to-server or curl requests (no Origin header)
        if (!origin) return cb(null, true);

        if (env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );

  // Rate limits per route group (NOT global)
  const isProd = env.NODE_ENV === "production";

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 30 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 300 : 10000,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const adminAiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 60 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 3000 : 50000,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(pinoHttp({ logger }));

  app.use((req, res, next) => {
    if (
      req.path.startsWith("/admin") ||
      req.path.startsWith("/auth") ||
      req.path.startsWith("/public/preview")
    ) {
      res.setHeader("Cache-Control", "no-store");
      return next();
    }

    if (req.path.startsWith("/public")) {
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      return next();
    }

    res.setHeader("Cache-Control", "no-store");
    return next();
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: "dsgnfi-cms-api",
      environment: env.NODE_ENV,
    });
  });

  app.get("/ready", async (_req: Request, res: Response) => {
    const readiness = await getReadinessStatus(prisma);
    return res.status(readiness.ok ? 200 : 503).json(readiness);
  });

  if (env.NODE_ENV === "development") {
    app.get("/debug/runtime", (_req: Request, res: Response) => {
      res.json({
        ok: true,
        runtime: runtimeDebug,
      });
    });
  }

  app.get("/health/db", async (_req: Request, res: Response) => {
    const readiness = await getReadinessStatus(prisma);
    if (!readiness.ok) {
      logger.error({ readiness }, "Database health check failed");
    }
    res.status(readiness.checks.database === "ok" ? 200 : 503).json({
      ok: readiness.checks.database === "ok",
      service: readiness.service,
      db: { ok: readiness.checks.database === "ok" },
    });
  });

  app.use("/uploads", express.static(uploadsDir));
  app.use("/auth", authLimiter, authRouter);

  app.use("/public", publicLimiter);
  app.use("/public/cms", cmsPublicRouter);
  app.use("/public/contact", contactPublicRouter);
  app.use("/public/site", sitePublicRouter);
  app.use("/public/preview", previewPublicRouter);
  app.use("/public/pages", pagesPublicRouter);
  app.use("/public/work", workPublicRouter);
  app.use("/public/process", processPublicRouter);

  app.use("/admin/ai", adminAiLimiter, adminAiRouter);
  app.use("/admin", adminLimiter);
  app.use("/admin/audit", auditAdminRouter);
  app.use("/admin/cms", cmsAdminRouter);
  app.use("/admin/assets", assetsAdminRouter);
  app.use("/admin/domains", domainsAdminRouter);
  app.use("/admin/preview", previewAdminRouter);
  app.use("/admin/uploads", uploadsRouter);
  app.use("/admin/site-settings", siteSettingsAdminRouter);
  app.use("/admin/templates", templatesAdminRouter);
  app.use("/admin/sites", sitesAdminRouter);
  app.use("/admin/pages", pagesAdminRouter);
  app.use("/admin/work", workAdminRouter);
  app.use("/admin/process", processAdminRouter);

  // Error handler (must be last)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "Unhandled error");

    const status =
      (err as { status?: number; statusCode?: number }).status ??
      (err as { statusCode?: number }).statusCode ??
      500;
    const isServerError = status >= 500;
    const message = isServerError
      ? "Internal Server Error"
      : err.message || "Request failed";

    res.status(status).json({
      ok: false,
      error: {
        code: isServerError ? "internal_error" : "request_failed",
        message,
      },
    });
  });

  return app;
}
