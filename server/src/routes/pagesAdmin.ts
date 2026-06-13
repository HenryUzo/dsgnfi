import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireRole } from "../middleware/requireRole";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import { MissingOpenAIKeyError } from "../services/adminAi";
import {
  createPagePrefillSuggestions,
  deletePrefillRunArtifactsNow,
  getLatestPagePrefillReview,
  getPagePrefillReviewByRun,
  getTemporaryPrefillArtifacts,
  persistPagePrefillSuggestions,
  recordPrefillApplication,
  recordPrefillRejection,
} from "../services/adminAiPrefill";
import { writeAuditLog } from "../services/auditLog";
import {
  applyLegacyHomeMigrationPreview,
  cancelLegacyHomeMigrationPreview,
  generateLegacyHomeMigrationPreview,
  isLegacyMigrationSourceChangedError,
} from "../services/legacyHomeMigration";
import { pageSlugSchema } from "../services/pageValidation";
import {
  createAdminPage,
  deleteAdminPage,
  duplicateAdminPage,
  getAdminPageDraft,
  getAdminPageHistory,
  listAdminAddablePageTemplates,
  listAdminPages,
  publishAdminPage,
  renameAdminPageTitle,
  restoreAdminPageRevision,
  saveAdminPageDraft,
  setAdminPageVisibility,
  updateAdminPageMeta,
} from "../services/pageAdmin";

const router = Router();

const pageParamsSchema = z.object({
  pageKey: z.string().min(1),
});

const restoreParamsSchema = z.object({
  pageKey: z.string().min(1),
  revisionId: z.string().min(1),
});

const metaUpdateSchema = z.object({
  title: z.string().trim().min(1),
  slug: pageSlugSchema,
  seoTitle: z.string().trim().min(1).nullable().optional(),
  seoDescription: z.string().trim().min(1).nullable().optional(),
  hierarchyRole: z.enum(["MAIN", "INNER"]),
  defaultParentPageKey: z.string().trim().min(1).nullable().optional(),
});

const titleUpdateSchema = z.object({
  title: z.string().trim().min(1),
});

const visibilitySchema = z.object({
  isVisible: z.boolean(),
});

const prefillSchema = z.object({
  artifactIds: z.array(z.string().trim().min(1)).min(1).max(3),
});

const prefillRunParamsSchema = z.object({
  pageKey: z.string().min(1),
  runId: z.string().min(1),
});

const prefillApplicationSchema = z.object({
  selectedMetadata: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
  selectedSuggestionIds: z.array(z.string().trim().min(1).max(120)).max(24).default([]),
  appliedPatch: z.record(z.string(), z.unknown()).default({}),
});

const legacyMigrationApplySchema = z.object({
  sourceFingerprint: z.string().trim().min(16).max(256),
  proposedContent: z.object({
    blocks: z
      .array(
        z.object({
          id: z.string().trim().min(1),
          type: z.string().trim().min(1),
          data: z.record(z.string(), z.unknown()),
        })
      )
      .default([]),
  }),
});

const legacyMigrationCancelSchema = z.object({
  sourceFingerprint: z.string().trim().min(16).max(256).optional(),
});

function getSiteId(req: Request, res: Response) {
  const siteId = req.context?.siteId;
  if (!siteId) {
    res.status(500).json({
      ok: false,
      error: { message: "Missing admin site context." },
    });
    return null;
  }

  return siteId;
}

function getAdminId(req: Request, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({
      ok: false,
      error: { message: "Unauthorized" },
    });
    return null;
  }

  return adminId;
}

function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid payload.";
}

router.use(requireAdmin, withAdminSiteContext);

router.get("/", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const pages = await listAdminPages(prisma, siteId);
  return res.json({ ok: true, pages });
});

router.get("/catalog", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const templates = await listAdminAddablePageTemplates(prisma, siteId);
  return res.json({ ok: true, templates });
});

router.post("/", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const result = await createAdminPage(prisma, {
    siteId,
    adminId,
    payload: req.body,
  });

  if (result.type === "template_not_found") {
    return res.status(400).json({
      ok: false,
      error: { message: "Selected page template is not available for this site." },
    });
  }

  if (result.type === "validation_error") {
    return res.status(400).json({
      ok: false,
      error: { message: getValidationMessage(result.error) },
    });
  }

  return res.status(201).json({ ok: true, page: result.page });
});

router.get("/:pageKey/draft", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsed = pageParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid page key." },
    });
  }

  const page = await getAdminPageDraft(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
  });

  if (!page) {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  return res.json({ ok: true, page });
});

router.put("/:pageKey/draft", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = pageParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid page key." },
    });
  }

  const result = await saveAdminPageDraft(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
    adminId,
    payload: req.body,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  if (result.type === "validation_error") {
    return res.status(400).json({
      ok: false,
      error: { message: getValidationMessage(result.error) },
    });
  }

  return res.json({ ok: true, page: result.page });
});

router.patch("/:pageKey/meta", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsedParams = pageParamsSchema.safeParse(req.params);
  const parsedBody = metaUpdateSchema.safeParse(req.body ?? {});

  if (!parsedParams.success || !parsedBody.success) {
    return res.status(400).json({
      ok: false,
      error: {
        message: parsedBody.success
          ? "Invalid page key."
          : getValidationMessage(parsedBody.error),
      },
    });
  }

  const result = await updateAdminPageMeta(prisma, {
    siteId,
    pageKey: parsedParams.data.pageKey,
    adminId,
    payload: parsedBody.data,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  return res.json({ ok: true, page: result.page });
});

router.patch("/:pageKey/title", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsedParams = pageParamsSchema.safeParse(req.params);
  const parsedBody = titleUpdateSchema.safeParse(req.body ?? {});

  if (!parsedParams.success || !parsedBody.success) {
    return res.status(400).json({
      ok: false,
      error: {
        message: parsedBody.success
          ? "Invalid page key."
          : getValidationMessage(parsedBody.error),
      },
    });
  }

  const result = await renameAdminPageTitle(prisma, {
    siteId,
    pageKey: parsedParams.data.pageKey,
    adminId,
    title: parsedBody.data.title,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  return res.json({ ok: true, page: result.page });
});

router.patch("/:pageKey/visibility", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsedParams = pageParamsSchema.safeParse(req.params);
  const parsedBody = visibilitySchema.safeParse(req.body ?? {});

  if (!parsedParams.success || !parsedBody.success) {
    return res.status(400).json({
      ok: false,
      error: {
        message: parsedBody.success
          ? "Invalid page key."
          : getValidationMessage(parsedBody.error),
      },
    });
  }

  const result = await setAdminPageVisibility(prisma, {
    siteId,
    pageKey: parsedParams.data.pageKey,
    adminId,
    isVisible: parsedBody.data.isVisible,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  return res.json({ ok: true, page: result.page });
});

router.post("/:pageKey/duplicate", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = pageParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid page key." },
    });
  }

  const result = await duplicateAdminPage(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
    adminId,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  return res.status(201).json({ ok: true, page: result.page });
});

router.delete("/:pageKey", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = pageParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid page key." },
    });
  }

  const result = await deleteAdminPage(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
    adminId,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  return res.json({ ok: true, pageKey: result.page.pageKey });
});

router.post("/:pageKey/publish", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = pageParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid page key." },
    });
  }

  const result = await publishAdminPage(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
    adminId,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  if (result.type === "validation_error") {
    return res.status(400).json({
      ok: false,
      error: { message: getValidationMessage(result.error) },
    });
  }

  return res.json({ ok: true, page: result.page });
});

router.get("/:pageKey/ai/prefill/latest", async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  const tenantId = req.context?.tenantId;
  if (!siteId || !adminId || !tenantId) return;

  const parsedParams = pageParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      ok: false,
      error: { code: "validation_failed", message: "Invalid page key." },
    });
  }

  const review = await getLatestPagePrefillReview({
    prisma,
    adminId,
    tenantId,
    siteId,
    pageKey: parsedParams.data.pageKey,
  });

  return res.json({ ok: true, suggestions: review });
});

router.post("/:pageKey/ai/prefill", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  const tenantId = req.context?.tenantId;
  if (!siteId || !adminId || !tenantId) return;

  const parsedParams = pageParamsSchema.safeParse(req.params);
  const parsedBody = prefillSchema.safeParse(req.body ?? {});
  if (!parsedParams.success || !parsedBody.success) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "validation_failed",
        message: parsedBody.success ? "Invalid page key." : getValidationMessage(parsedBody.error),
      },
    });
  }

  const page = await getAdminPageDraft(prisma, {
    siteId,
    pageKey: parsedParams.data.pageKey,
  });
  if (!page) {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  const artifacts = await getTemporaryPrefillArtifacts({
    prisma,
    adminId,
    tenantId,
    siteId,
    pageKey: parsedParams.data.pageKey,
    artifactIds: parsedBody.data.artifactIds,
  });
  if (artifacts.length === 0) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "prefill_artifacts_not_found",
        message: "Upload a fresh brief before requesting AI prefill suggestions.",
      },
    });
  }

  try {
    const pageContent = page.content as { blocks?: unknown[] };
    const pageBlocks = Array.isArray(pageContent.blocks) ? pageContent.blocks : [];
    const suggestions = await createPagePrefillSuggestions({
      adminId,
      artifacts,
      page: {
        pageKey: page.pageKey,
        title: page.title,
        slug: page.slug,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        allowedBlockTypes: page.allowedBlockTypes,
        blocks: pageBlocks.map((block) => {
          const record = block as { id?: unknown; type?: unknown; data?: unknown };
          return {
            id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
            type: typeof record.type === "string" ? record.type : "unknown",
            data:
              record.data && typeof record.data === "object" && !Array.isArray(record.data)
                ? (record.data as Record<string, unknown>)
                : {},
          };
        }),
      },
    });
    const runId = artifacts[0]?.runId;
    const persistedSuggestions = runId
      ? await persistPagePrefillSuggestions({
          prisma,
          runId,
          pageId: page.id,
          suggestions,
        })
      : suggestions;

    await writeAuditLog(prisma, {
      actorAdminUserId: adminId,
      siteId,
      action: "ai_prefill.generated",
      entityType: runId ? "AiPrefillRun" : "Page",
      entityId: runId ?? page.pageKey,
      metadata: {
        pageKey: page.pageKey,
        artifactCount: artifacts.length,
        artifactTypes: artifacts.map((artifact) => artifact.mimeType),
        suggestedBlockCount: persistedSuggestions.blocks.length,
        suggestedMetadata: Boolean(
          persistedSuggestions.page.title ||
            persistedSuggestions.page.seoTitle ||
            persistedSuggestions.page.seoDescription
        ),
      },
    });

    if (runId) {
      const review = await getPagePrefillReviewByRun({
        prisma,
        adminId,
        tenantId,
        siteId,
        pageKey: page.pageKey,
        runId,
      });
      return res.json({ ok: true, suggestions: review ?? persistedSuggestions });
    }

    return res.json({ ok: true, suggestions: persistedSuggestions });
  } catch (error) {
    if (error instanceof MissingOpenAIKeyError) {
      return res.status(503).json({
        ok: false,
        error: {
          code: "openai_not_configured",
          message: "OpenAI is not configured for this server.",
        },
      });
    }

    throw error;
  }
});

router.post("/:pageKey/ai/prefill/:runId/apply", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsedParams = prefillRunParamsSchema.safeParse(req.params);
  const parsedBody = prefillApplicationSchema.safeParse(req.body ?? {});
  if (!parsedParams.success || !parsedBody.success) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "validation_failed",
        message: parsedBody.success ? "Invalid prefill run." : getValidationMessage(parsedBody.error),
      },
    });
  }

  const page = await getAdminPageDraft(prisma, {
    siteId,
    pageKey: parsedParams.data.pageKey,
  });

  const result = await recordPrefillApplication({
    prisma,
    adminId,
    siteId,
    pageId: page?.id ?? null,
    pageKey: parsedParams.data.pageKey,
    runId: parsedParams.data.runId,
    selectedMetadata: parsedBody.data.selectedMetadata,
    selectedSuggestionIds: parsedBody.data.selectedSuggestionIds,
    appliedPatch: parsedBody.data.appliedPatch,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { code: "prefill_run_not_found", message: "Prefill run not found." },
    });
  }

  await writeAuditLog(prisma, {
    actorAdminUserId: adminId,
    siteId,
    action: "ai_prefill.applied",
    entityType: "AiPrefillRun",
    entityId: parsedParams.data.runId,
    metadata: {
      pageKey: parsedParams.data.pageKey,
      selectedMetadata: parsedBody.data.selectedMetadata,
      selectedSuggestionCount: parsedBody.data.selectedSuggestionIds.length,
    },
  });

  return res.json({ ok: true });
});

router.post("/:pageKey/ai/prefill/:runId/reject", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsedParams = prefillRunParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      ok: false,
      error: { code: "validation_failed", message: "Invalid prefill run." },
    });
  }

  const page = await getAdminPageDraft(prisma, {
    siteId,
    pageKey: parsedParams.data.pageKey,
  });

  const result = await recordPrefillRejection({
    prisma,
    adminId,
    siteId,
    pageId: page?.id ?? null,
    pageKey: parsedParams.data.pageKey,
    runId: parsedParams.data.runId,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { code: "prefill_run_not_found", message: "Prefill run not found." },
    });
  }

  await writeAuditLog(prisma, {
    actorAdminUserId: adminId,
    siteId,
    action: "ai_prefill.rejected",
    entityType: "AiPrefillRun",
    entityId: parsedParams.data.runId,
    metadata: { pageKey: parsedParams.data.pageKey },
  });

  return res.json({ ok: true });
});

router.delete("/:pageKey/ai/prefill/:runId/brief", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  const tenantId = req.context?.tenantId;
  if (!siteId || !adminId || !tenantId) return;

  const parsedParams = prefillRunParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      ok: false,
      error: { code: "validation_failed", message: "Invalid prefill run." },
    });
  }

  const result = await deletePrefillRunArtifactsNow({
    prisma,
    adminId,
    tenantId,
    siteId,
    pageKey: parsedParams.data.pageKey,
    runId: parsedParams.data.runId,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { code: "prefill_run_not_found", message: "Prefill run not found." },
    });
  }

  await writeAuditLog(prisma, {
    actorAdminUserId: adminId,
    siteId,
    action: "ai_prefill.deleted",
    entityType: "AiPrefillRun",
    entityId: parsedParams.data.runId,
    metadata: {
      pageKey: parsedParams.data.pageKey,
      deletedArtifactCount: result.deletedCount,
    },
  });

  return res.json({ ok: true, suggestions: result.review });
});

router.post(
  "/home/legacy-migration/preview",
  requireRole(["OWNER", "ADMIN", "EDITOR"]),
  async (req, res) => {
    const siteId = getSiteId(req, res);
    const adminId = getAdminId(req, res);
    const tenantId = req.context?.tenantId;
    if (!siteId || !adminId || !tenantId) return;

    const result = await generateLegacyHomeMigrationPreview(prisma, {
      tenantId,
      siteId,
    });

    if (result.type === "not_found" || result.type === "page_not_found") {
      return res.status(404).json({
        ok: false,
        error: { code: "legacy_migration_not_found", message: "Homepage migration source was not found." },
      });
    }

    if (result.type === "empty_legacy") {
      return res.status(400).json({
        ok: false,
        error: {
          code: "legacy_migration_empty",
          message: "There is no legacy homepage content available to migrate.",
        },
      });
    }

    await writeAuditLog(prisma, {
      actorAdminUserId: adminId,
      siteId,
      action: "legacy_home_migration.preview_generated",
      entityType: "Page",
      entityId: result.page.id,
      metadata: {
        pageKey: "home",
        sourceFingerprint: result.preview.sourceFingerprint,
        mappedSections: result.preview.summary.mappedSections,
        unsupportedSections: result.preview.summary.unsupportedSections,
        unsupportedFields: result.preview.summary.unsupportedFields,
      },
    });

    return res.json({ ok: true, preview: result.preview });
  }
);

router.post(
  "/home/legacy-migration/apply",
  requireRole(["OWNER", "ADMIN", "EDITOR"]),
  async (req, res) => {
    const siteId = getSiteId(req, res);
    const adminId = getAdminId(req, res);
    const tenantId = req.context?.tenantId;
    if (!siteId || !adminId || !tenantId) return;

    const parsedBody = legacyMigrationApplySchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "validation_failed",
          message: getValidationMessage(parsedBody.error),
        },
      });
    }

    try {
      const result = await applyLegacyHomeMigrationPreview(prisma, {
        tenantId,
        siteId,
        adminId,
        sourceFingerprint: parsedBody.data.sourceFingerprint,
        proposedContent: parsedBody.data.proposedContent,
      });

      if (result.type === "not_found" || result.type === "page_not_found") {
        return res.status(404).json({
          ok: false,
          error: { code: "legacy_migration_not_found", message: "Homepage migration target was not found." },
        });
      }

      if (result.type === "empty_legacy") {
        return res.status(400).json({
          ok: false,
          error: {
            code: "legacy_migration_empty",
            message: "There is no legacy homepage content available to migrate.",
          },
        });
      }

      if (result.type === "validation_error") {
        return res.status(400).json({
          ok: false,
          error: {
            code: "legacy_migration_invalid_preview",
            message: result.unsupportedItems[0]?.description ?? "The proposed migration preview is not valid.",
          },
        });
      }

      await writeAuditLog(prisma, {
        actorAdminUserId: adminId,
        siteId,
        action: "legacy_home_migration.applied",
        entityType: "Page",
        entityId: result.page.id,
        metadata: {
          pageKey: "home",
          sourceFingerprint: parsedBody.data.sourceFingerprint,
          draftRevisionNumber: result.page.draftRevisionNumber,
        },
      });

      return res.json({ ok: true, page: result.page });
    } catch (error) {
      if (isLegacyMigrationSourceChangedError(error)) {
        await writeAuditLog(prisma, {
          actorAdminUserId: adminId,
          siteId,
          action: "legacy_home_migration.rejected_stale_source",
          entityType: "Page",
          entityId: "home",
          metadata: {
            pageKey: "home",
            sourceFingerprint: parsedBody.data.sourceFingerprint,
          },
        });

        return res.status(409).json({
          ok: false,
          error: {
            code: "LEGACY_MIGRATION_SOURCE_CHANGED",
            message: "Legacy homepage content changed after the preview was generated. Regenerate the preview and try again.",
          },
        });
      }

      throw error;
    }
  }
);

router.post(
  "/home/legacy-migration/cancel",
  requireRole(["OWNER", "ADMIN", "EDITOR"]),
  async (req, res) => {
    const siteId = getSiteId(req, res);
    const adminId = getAdminId(req, res);
    const tenantId = req.context?.tenantId;
    if (!siteId || !adminId || !tenantId) return;

    const parsedBody = legacyMigrationCancelSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "validation_failed",
          message: getValidationMessage(parsedBody.error),
        },
      });
    }

    const result = await cancelLegacyHomeMigrationPreview(prisma, {
      tenantId,
      siteId,
    });

    if (result.type === "not_found") {
      return res.status(404).json({
        ok: false,
        error: { code: "legacy_migration_not_found", message: "Homepage migration source was not found." },
      });
    }

    await writeAuditLog(prisma, {
      actorAdminUserId: adminId,
      siteId,
      action: "legacy_home_migration.cancelled",
      entityType: "Page",
      entityId: "home",
      metadata: {
        pageKey: "home",
        sourceFingerprint: parsedBody.data.sourceFingerprint ?? null,
      },
    });

    return res.json({ ok: true });
  }
);

router.get("/:pageKey/history", async (req, res) => {
  const siteId = getSiteId(req, res);
  if (!siteId) return;

  const parsed = pageParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid page key." },
    });
  }

  const revisions = await getAdminPageHistory(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
  });

  if (!revisions) {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  return res.json({ ok: true, revisions });
});

router.post("/:pageKey/restore/:revisionId", requireRole(["OWNER", "ADMIN", "EDITOR"]), async (req, res) => {
  const siteId = getSiteId(req, res);
  const adminId = getAdminId(req, res);
  if (!siteId || !adminId) return;

  const parsed = restoreParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Invalid restore request." },
    });
  }

  const result = await restoreAdminPageRevision(prisma, {
    siteId,
    pageKey: parsed.data.pageKey,
    revisionId: parsed.data.revisionId,
    adminId,
  });

  if (result.type === "not_found") {
    return res.status(404).json({
      ok: false,
      error: { message: "Page or revision not found." },
    });
  }

  if (result.type === "validation_error") {
    return res.status(400).json({
      ok: false,
      error: { message: getValidationMessage(result.error) },
    });
  }

  return res.json({ ok: true, page: result.page });
});

export default router;
