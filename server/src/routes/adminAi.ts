import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import {
  createAdminAiReply,
  MissingOpenAIKeyError,
  type AdminAiAttachment,
  type AdminAiContext,
} from "../services/adminAi";
import {
  storeTemporaryPrefillArtifacts,
  type PrefillArtifactInput,
} from "../services/adminAiPrefill";
import { writeAuditLog } from "../services/auditLog";

const router = Router();

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const contextSchema = z.object({
  route: z.string().trim().min(1).max(500),
  screenTitle: z.string().trim().min(1).max(160),
  tenantName: z.string().trim().max(160).nullable().optional(),
  siteName: z.string().trim().max(160).nullable().optional(),
  role: z.string().trim().max(40).nullable().optional(),
  pageEditor: z
    .object({
      pageKey: z.string().trim().max(120).nullable().optional(),
      title: z.string().trim().max(240).nullable().optional(),
      slug: z.string().trim().max(240).nullable().optional(),
      pageTemplateKey: z.string().trim().max(160).nullable().optional(),
      allowedBlockTypes: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
      blockTypes: z.array(z.string().trim().min(1).max(80)).max(80).optional(),
    })
    .nullable()
    .optional(),
});

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  mimeType: z.string().trim().min(1).max(120),
  dataUrl: z.string().trim().min(1).max(8_000_000),
  kind: z.enum(["image", "document"]),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
  context: contextSchema,
  attachments: z.array(attachmentSchema).max(3).optional(),
});

const prefillArtifactSchema = z.object({
  pageKey: z.string().trim().min(1).max(120),
  files: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(180),
        mimeType: z.string().trim().min(1).max(160),
        dataUrl: z.string().trim().min(1).max(12_000_000),
      })
    )
    .min(1)
    .max(3),
});

async function writeAdminAiAudit(options: {
  adminId: string;
  siteId?: string | null;
  context: AdminAiContext;
  messageCount: number;
  attachments: AdminAiAttachment[];
  intentId: string;
  returnedLinkCount: number;
}) {
  try {
    await writeAuditLog(prisma, {
      actorAdminUserId: options.adminId,
      siteId: options.siteId ?? null,
      action: "AI_GUIDE_REQUESTED",
      entityType: "AdminAiGuide",
      entityId: options.intentId,
      metadata: {
        route: options.context.route,
        screenTitle: options.context.screenTitle,
        messageCount: options.messageCount,
        attachmentCount: options.attachments.length,
        attachmentTypes: options.attachments.map((attachment) => attachment.mimeType),
        intentId: options.intentId,
        returnedLinkCount: options.returnedLinkCount,
      },
    });
  } catch {
    // AI guidance should not fail because optional audit persistence is unavailable.
  }
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

router.use(requireAdmin, withAdminSiteContext);

router.post("/chat", async (req, res) => {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const parsed = chatRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "validation_failed",
        message: "Invalid AI chat request.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    });
  }

  const context: AdminAiContext = {
    ...parsed.data.context,
    tenantName: parsed.data.context.tenantName ?? req.context?.tenantSlug ?? null,
    siteName: parsed.data.context.siteName ?? req.context?.siteSlug ?? null,
    role: parsed.data.context.role ?? req.context?.membershipRole ?? null,
  };

  try {
    const requestAttachments = (parsed.data.attachments ?? []) as AdminAiAttachment[];
    const content = await createAdminAiReply({
      adminId,
      messages: parsed.data.messages,
      context,
      attachments: requestAttachments,
    });

    await writeAdminAiAudit({
      adminId,
      siteId: req.context?.siteId ?? null,
      context,
      messageCount: parsed.data.messages.length,
      attachments: requestAttachments,
      intentId: content.intent.id,
      returnedLinkCount: content.guide.links.length,
    });
    const messageContent = {
      content: content.content,
      guide: content.guide,
    };

    return res.json({
      ok: true,
      message: { role: "assistant", ...messageContent },
    });
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

router.post("/prefill-artifacts", async (req, res) => {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const tenantId = req.context?.tenantId;
  const siteId = req.context?.siteId;
  if (!tenantId || !siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing admin site context." },
    });
  }

  const parsed = prefillArtifactSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "validation_failed",
        message: "Invalid prefill upload request.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    });
  }

  const result = await storeTemporaryPrefillArtifacts({
    prisma,
    adminId,
    tenantId,
    siteId,
    pageKey: parsed.data.pageKey,
    pageId:
      (
        await prisma.page.findUnique({
          where: { siteId_pageKey: { siteId, pageKey: parsed.data.pageKey } },
          select: { id: true },
        })
      )?.id ?? null,
    files: parsed.data.files as PrefillArtifactInput[],
  });

  if (result.type === "validation_error") {
    return res.status(400).json({
      ok: false,
      error: { code: "validation_failed", message: result.message },
    });
  }

  await writeAuditLog(prisma, {
    actorAdminUserId: adminId,
    siteId,
    action: "ai_prefill.uploaded",
    entityType: "AiPrefillRun",
    entityId: result.runId,
    metadata: {
      pageKey: parsed.data.pageKey,
      artifactCount: result.artifacts.length,
      artifactTypes: result.artifacts.map((artifact) => artifact.mimeType),
    },
  });

  return res.status(201).json({
    ok: true,
    runId: result.runId,
    artifacts: result.artifacts,
  });
});

export default router;
