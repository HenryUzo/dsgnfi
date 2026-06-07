import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { requireAdmin } from "../middleware/requireAdmin";
import { withAdminSiteContext } from "../middleware/withAdminSiteContext";
import {
  createAdminAiReply,
  MissingOpenAIKeyError,
  type AdminAiAttachment,
  type AdminAiContext,
} from "../services/adminAi";

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
    const content = await createAdminAiReply({
      adminId,
      messages: parsed.data.messages,
      context,
      attachments: (parsed.data.attachments ?? []) as AdminAiAttachment[],
    });

    return res.json({
      ok: true,
      message: { role: "assistant", ...content },
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

export default router;
