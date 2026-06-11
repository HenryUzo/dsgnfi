import { Router } from "express";
import crypto from "crypto";
import path from "path";
import multer from "multer";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireRole } from "../middleware/requireRole";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import { apiError, ApiRequestError, zodApiError } from "../services/apiErrors";
import {
  createCustomTemplate,
  getTemplateDetail,
  listAdminTemplates,
  listTemplateUsages,
  publishCustomTemplate,
  updateCustomTemplate,
} from "../services/templateCatalog";
import {
  getTemplateImport,
  importReactViteTemplate,
  publishTemplateImport,
} from "../services/templateImport";
import { getUploadsDir } from "../services/uploadStorage";

const router = Router();

const importUpload = multer({
  storage: multer.diskStorage({
    destination: getUploadsDir(),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".zip";
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isZip =
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.originalname.toLowerCase().endsWith(".zip");
    if (!isZip) {
      cb(new Error("Only .zip template bundles are supported."));
      return;
    }
    cb(null, true);
  },
});

const listQuerySchema = z.object({
  category: z.string().min(1).optional(),
  scope: z.enum(["all", "starter", "custom"]).optional(),
});

const paramsSchema = z.object({
  templateKey: z.string().min(1),
});

const templateIdSchema = z.object({
  templateId: z.string().min(1),
});

const createTemplateSchema = z
  .object({
    name: z.string().trim().min(1, "Template name is required."),
    description: z.string().trim().min(1, "Template description is required."),
    category: z.string().trim().min(1, "Template category is required."),
    sourceTemplateKey: z.string().trim().min(1).optional(),
    sourceSiteId: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) => Boolean(value.sourceTemplateKey || value.sourceSiteId),
    "Choose a starter template or an existing site."
  );

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required."),
  description: z.string().trim().min(1, "Template description is required."),
  category: z.string().trim().min(1, "Template category is required."),
  presetOverrides: z.record(z.string(), z.unknown()),
});

function getTenantId(req: { context?: { tenantId?: string } }, res: any) {
  const tenantId = req.context?.tenantId;
  if (!tenantId) {
    res.status(500).json(
      apiError("admin_tenant_context_missing", "Missing admin tenant context.")
    );
    return null;
  }

  return tenantId;
}

router.use(requireAdmin, withAdminSiteContext);

router.get("/", async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json(zodApiError("template_query_invalid", parsed.error));
  }

  const templates = await listAdminTemplates(prisma, {
    tenantId,
    category: parsed.data.category ?? null,
    scope: parsed.data.scope ?? "all",
  });

  return res.json({ ok: true, templates });
});

router.post(
  "/imports",
  requireRole(["OWNER", "ADMIN"]),
  importUpload.single("bundle"),
  async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const adminId = req.admin?.id;
    if (!adminId) {
      return res
        .status(401)
        .json(apiError("not_authenticated", "Not authenticated."));
    }

    if (!req.file) {
      return res
        .status(400)
        .json(apiError("template_import_file_missing", "Upload a zip bundle."));
    }

    try {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const siteId = req.context?.siteId;
      if (!siteId) {
        return res
          .status(500)
          .json(apiError("site_context_missing", "Missing admin site context."));
      }
      const imported = await importReactViteTemplate(prisma, {
        tenantId,
        siteId,
        adminId,
        zipPath: req.file.path,
        originalFilename: req.file.originalname,
        baseUrl,
      });

      return res.status(201).json({ ok: true, import: imported });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return res
          .status(error.statusCode)
          .json(apiError(error.code, error.message, error.fieldErrors));
      }

      return res
        .status(500)
        .json(apiError("template_import_failed", "Failed to import template bundle."));
    }
  }
);

router.get("/imports/:importId", async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const importId = z.string().min(1).safeParse(req.params.importId);
  if (!importId.success) {
    return res.status(400).json(apiError("template_import_id_invalid", "Invalid import id."));
  }

  const imported = await getTemplateImport(prisma, {
    tenantId,
    importId: importId.data,
  });

  if (!imported) {
    return res.status(404).json(apiError("template_import_not_found", "Import not found."));
  }

  return res.json({ ok: true, import: imported });
});

router.post(
  "/imports/:importId/publish",
  requireRole(["OWNER", "ADMIN"]),
  async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const adminId = req.admin?.id;
    if (!adminId) {
      return res
        .status(401)
        .json(apiError("not_authenticated", "Not authenticated."));
    }

    const importId = z.string().min(1).safeParse(req.params.importId);
    if (!importId.success) {
      return res.status(400).json(apiError("template_import_id_invalid", "Invalid import id."));
    }

    try {
      const template = await publishTemplateImport(prisma, {
        tenantId,
        adminId,
        importId: importId.data,
      });

      return res.json({ ok: true, template });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return res
          .status(error.statusCode)
          .json(apiError(error.code, error.message, error.fieldErrors));
      }

      return res
        .status(500)
        .json(apiError("template_import_publish_failed", "Failed to publish import."));
    }
  }
);

router.get("/:templateKey", async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json(apiError("template_key_invalid", "Invalid template key."));
  }

  const template = await getTemplateDetail(prisma, {
    tenantId,
    templateKey: parsed.data.templateKey,
  });
  if (!template) {
    return res.status(404).json({
      ok: false,
      error: { code: "template_not_found", message: "Template not found." },
    });
  }

  return res.json({ ok: true, template });
});

router.post("/", requireRole(["OWNER", "ADMIN"]), async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const adminId = req.admin?.id;
  if (!adminId) {
    return res
      .status(401)
      .json(apiError("not_authenticated", "Not authenticated."));
  }

  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(zodApiError("template_validation_failed", parsed.error));
  }

  try {
    const template = await createCustomTemplate(prisma, {
      tenantId,
      adminId,
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      sourceTemplateKey: parsed.data.sourceTemplateKey ?? null,
      sourceSiteId: parsed.data.sourceSiteId ?? null,
    });

    return res.status(201).json({ ok: true, template });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return res
        .status(error.statusCode)
        .json(apiError(error.code, error.message, error.fieldErrors));
    }

    return res
      .status(500)
      .json(apiError("template_create_failed", "Failed to create template."));
  }
});

router.patch("/:templateId", requireRole(["OWNER", "ADMIN"]), async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const adminId = req.admin?.id;
  if (!adminId) {
    return res
      .status(401)
      .json(apiError("not_authenticated", "Not authenticated."));
  }

  const params = templateIdSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json(apiError("template_id_invalid", "Invalid template id."));
  }

  const parsed = updateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(zodApiError("template_validation_failed", parsed.error));
  }

  try {
    const template = await updateCustomTemplate(prisma, {
      tenantId,
      templateId: params.data.templateId,
      adminId,
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      presetOverrides: parsed.data.presetOverrides,
    });

    return res.json({ ok: true, template });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return res
        .status(error.statusCode)
        .json(apiError(error.code, error.message, error.fieldErrors));
    }

    return res
      .status(500)
      .json(apiError("template_update_failed", "Failed to update template."));
  }
});

router.post(
  "/:templateId/publish",
  requireRole(["OWNER", "ADMIN"]),
  async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const adminId = req.admin?.id;
    if (!adminId) {
      return res
        .status(401)
        .json(apiError("not_authenticated", "Not authenticated."));
    }

    const params = templateIdSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json(apiError("template_id_invalid", "Invalid template id."));
    }

    try {
      const template = await publishCustomTemplate(prisma, {
        tenantId,
        templateId: params.data.templateId,
        adminId,
      });

      return res.json({ ok: true, template });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return res
          .status(error.statusCode)
          .json(apiError(error.code, error.message, error.fieldErrors));
      }

      return res
        .status(500)
        .json(apiError("template_publish_failed", "Failed to publish template."));
    }
  }
);

router.get("/:templateId/usages", async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const params = templateIdSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json(apiError("template_id_invalid", "Invalid template id."));
  }

  try {
    const sites = await listTemplateUsages(prisma, {
      tenantId,
      templateId: params.data.templateId,
    });

    return res.json({ ok: true, sites });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return res
        .status(error.statusCode)
        .json(apiError(error.code, error.message, error.fieldErrors));
    }

    return res
      .status(500)
      .json(apiError("template_usage_failed", "Failed to load template usage."));
  }
});

export default router;
