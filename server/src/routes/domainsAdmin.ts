import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import {
  createDomain,
  deleteDomain,
  listDomains,
  setPrimaryDomain,
  verifyDomain,
} from "../services/domainsAdmin";

const router = Router();

const createSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SUBDOMAIN"),
    subdomainLabel: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("CUSTOM"),
    hostname: z.string().trim().min(1),
  }),
]);

const paramsSchema = z.object({
  domainId: z.string().min(1),
});

function getSiteId(req: Request, res: Response) {
  const siteId = req.context?.siteId;
  if (!siteId) {
    res.status(500).json({ ok: false, error: { message: "Missing admin site context." } });
    return null;
  }
  return siteId;
}

function getAdminId(req: Request, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    return null;
  }
  return adminId;
}

router.use(requireAdmin, withAdminSiteContext);

router.get("/", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const domains = await listDomains(prisma, siteId);
  return res.json({ ok: true, domains });
});

router.post("/", async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = createSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const result =
    parsed.data.type === "SUBDOMAIN"
      ? await createDomain(prisma, {
          siteId,
          adminId,
          type: "SUBDOMAIN",
          subdomainLabel: parsed.data.subdomainLabel,
        })
      : await createDomain(prisma, {
          siteId,
          adminId,
          type: "CUSTOM",
          hostname: parsed.data.hostname,
        });

  if (result.type === "invalid") {
    return res.status(400).json({ ok: false, error: { message: result.message } });
  }

  if (result.type === "conflict") {
    return res.status(409).json({ ok: false, error: { message: result.message } });
  }

  return res.status(201).json({ ok: true, domain: result.domain });
});

router.post("/:domainId/verify", async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid domain id." } });
  }

  const result = await verifyDomain(prisma, {
    siteId,
    domainId: parsed.data.domainId,
    adminId,
  });

  if (result.type === "not_found") {
    return res.status(404).json({ ok: false, error: { message: "Domain not found." } });
  }

  return res.json({ ok: true, domain: result.domain });
});

router.post("/:domainId/set-primary", async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid domain id." } });
  }

  const result = await setPrimaryDomain(prisma, {
    siteId,
    domainId: parsed.data.domainId,
    adminId,
  });

  if (result.type === "not_found") {
    return res.status(404).json({ ok: false, error: { message: "Domain not found." } });
  }

  if (result.type === "blocked") {
    return res.status(400).json({ ok: false, error: { message: result.message } });
  }

  return res.json({ ok: true, domain: result.domain });
});

router.delete("/:domainId", async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Invalid domain id." } });
  }

  const deleted = await deleteDomain(prisma, {
    siteId,
    domainId: parsed.data.domainId,
    adminId,
  });

  if (!deleted) {
    return res.status(404).json({ ok: false, error: { message: "Domain not found." } });
  }

  return res.status(204).send();
});

export default router;
