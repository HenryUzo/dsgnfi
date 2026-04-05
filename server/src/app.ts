import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import fs from "fs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "path";
import pino from "pino";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { runtimeDebug } from "./debug/runtimeDebug";
import authRouter from "./routes/auth";
import cmsAdminRouter from "./routes/cmsAdmin";
import cmsPublicRouter from "./routes/cmsPublic";
import processAdminRouter from "./routes/processAdmin";
import processPublicRouter from "./routes/processPublic";
import sitesAdminRouter from "./routes/sitesAdmin";
import templatesAdminRouter from "./routes/templatesAdmin";
import uploadsRouter from "./routes/uploads";
import workAdminRouter from "./routes/workAdmin";
import workPublicRouter from "./routes/workPublic";

export function createApp() {
  const app = express();
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const logger = pino();

  fs.mkdirSync(uploadsDir, { recursive: true });

  // Stop 304/ETag caching behavior for an API (prevents fetch weirdness)
  app.set("etag", false);
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.use(express.json());
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

  const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 3000 : 50000,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(pinoHttp({ logger }));

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "dsgnfi-cms-api" });
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
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
      res.json({
        ok: true,
        service: "dsgnfi-cms-api",
        db: { ok: true },
      });
    } catch (error) {
      logger.error({ err: error }, "Database health check failed");
      res.status(503).json({
        ok: false,
        service: "dsgnfi-cms-api",
        db: { ok: false },
        error: { message: "Database unavailable" },
      });
    }
  });

  app.use("/uploads", express.static(uploadsDir));
  app.use("/auth", authLimiter, authRouter);

  app.use("/public", publicLimiter);
  app.use("/public/cms", cmsPublicRouter);
  app.use("/public/work", workPublicRouter);
  app.use("/public/process", processPublicRouter);

  app.use("/admin", adminLimiter);
  app.use("/admin/cms", cmsAdminRouter);
  app.use("/admin/uploads", uploadsRouter);
  app.use("/admin/templates", templatesAdminRouter);
  app.use("/admin/sites", sitesAdminRouter);
  app.use("/admin/work", workAdminRouter);
  app.use("/admin/process", processAdminRouter);

  // Error handler (must be last)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "Unhandled error");

    const status =
      (err as { status?: number; statusCode?: number }).status ??
      (err as { statusCode?: number }).statusCode ??
      500;

    res.status(status).json({
      ok: false,
      error: {
        message: err.message || "Internal Server Error",
      },
    });
  });

  return app;
}
