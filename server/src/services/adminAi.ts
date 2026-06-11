import crypto from "crypto";

import OpenAI from "openai";
import type {
  EasyInputMessage,
  ResponseFormatTextJSONSchemaConfig,
  ResponseInput,
  ResponseInputContent,
} from "openai/resources/responses/responses";

import { env } from "../config/env";
import {
  buildAdminGuideMetadata,
  getAvailableBlockTypes,
  resolveAdminGuideIntent,
  type AdminGuideIntent,
  type AdminGuideIntentId,
  type AdminGuideMetadata,
} from "./adminGuideContext";
import { redactSensitiveText } from "./adminAiRedaction";

export type AdminAiGuideLink = {
  label: string;
  href: string;
};

export type AdminAiGuide = {
  intro: string;
  steps: string[];
  note?: string | null;
  why?: string | null;
  intentId?: AdminGuideIntentId;
  primaryLink?: AdminAiGuideLink | null;
  links: AdminAiGuideLink[];
};

export type AdminAiAttachment = {
  name: string;
  mimeType: string;
  dataUrl: string;
  kind: "image" | "document";
};

export type AdminAiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AdminAiContext = {
  route: string;
  screenTitle: string;
  tenantName?: string | null;
  siteName?: string | null;
  role?: string | null;
  pageEditor?: {
    pageKey?: string | null;
    title?: string | null;
    slug?: string | null;
    pageTemplateKey?: string | null;
    allowedBlockTypes?: string[];
    blockTypes?: string[];
  } | null;
};

export class MissingOpenAIKeyError extends Error {
  constructor() {
    super("OpenAI is not configured.");
    this.name = "MissingOpenAIKeyError";
  }
}

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2400;
const ALLOWED_ADMIN_ROUTES = [
  "/admin",
  "/admin/sites",
  "/admin/templates",
  "/admin/pages",
  "/admin/site-settings",
  "/admin/work",
  "/admin/process",
] as const;

const guideResponseSchema: ResponseFormatTextJSONSchemaConfig = {
  type: "json_schema",
  name: "admin_guide_response",
  strict: true,
  description: "Read-only admin UI guidance with concise steps and internal admin links.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["intro", "steps", "note", "why", "links"],
    properties: {
      intro: {
        type: "string",
        minLength: 1,
        maxLength: 320,
      },
      steps: {
        type: "array",
        minItems: 1,
        maxItems: 6,
        items: {
          type: "string",
          minLength: 1,
          maxLength: 280,
        },
      },
      note: {
        type: ["string", "null"],
        maxLength: 240,
      },
      why: {
        type: ["string", "null"],
        maxLength: 320,
      },
      links: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "href"],
          properties: {
            label: {
              type: "string",
              minLength: 1,
              maxLength: 48,
            },
            href: {
              type: "string",
              minLength: 1,
              maxLength: 240,
            },
          },
        },
      },
    },
  },
};

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
}

function getOpenAiModel() {
  return process.env.OPENAI_MODEL || env.OPENAI_MODEL;
}

function trimContent(value: string) {
  const trimmed = redactSensitiveText(value).trim();
  if (trimmed.length <= MAX_MESSAGE_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_MESSAGE_LENGTH)}...`;
}

function hashAdminId(adminId: string) {
  return crypto.createHash("sha256").update(adminId).digest("hex").slice(0, 64);
}

function getAllowedRouteSummary(context: AdminAiContext) {
  const routes: string[] = [...ALLOWED_ADMIN_ROUTES];
  if (context.route.startsWith("/admin") && !routes.includes(context.route)) {
    routes.push(context.route);
  }

  if (context.pageEditor?.slug && context.route.startsWith("/admin/pages/")) {
    routes.push(context.route);
  }

  return Array.from(new Set(routes));
}

function getAttachmentSummary(attachments: AdminAiAttachment[]) {
  if (attachments.length === 0) {
    return "No uploaded files.";
  }

  return attachments.map((attachment) => `${attachment.kind}: ${attachment.name} (${attachment.mimeType})`).join("\n");
}

function buildFallbackGuide(context: AdminAiContext, intent: AdminGuideIntent, content: string): AdminAiGuide {
  const intro =
    content.trim() ||
    `You're on ${context.screenTitle}. Open the linked admin screen and follow the steps there.`;

  return {
    intro,
    steps: ["Open the linked admin screen.", "Use the visible controls on that page to complete the task."],
    note: "This assistant can guide you, but it does not make admin changes itself.",
    why: intent.routeHints[0] ?? "This screen is the safest admin destination for the requested task.",
    intentId: intent.id,
    primaryLink: intent.primaryLink,
    links: intent.links,
  };
}

function sanitizeGuide(
  rawGuide: Partial<AdminAiGuide> | null | undefined,
  context: AdminAiContext,
  intent: AdminGuideIntent
): AdminAiGuide {
  if (!rawGuide) {
    return buildFallbackGuide(context, intent, "");
  }

  const intro = typeof rawGuide.intro === "string" ? rawGuide.intro.trim() : "";
  const steps = Array.isArray(rawGuide.steps)
    ? rawGuide.steps.map((step) => step.trim()).filter(Boolean).slice(0, 6)
    : [];
  const note = typeof rawGuide.note === "string" ? rawGuide.note.trim() : null;
  const why = typeof rawGuide.why === "string" ? rawGuide.why.trim() : null;

  const normalized: AdminAiGuide = {
    intro: intro || `You're on ${context.screenTitle}. Follow these steps in the admin UI.`,
    steps: steps.length > 0 ? steps : ["Open the linked admin screen.", "Use the controls on that page to complete the task."],
    note,
    why: why || intent.routeHints[0] || null,
    intentId: intent.id,
    primaryLink: intent.primaryLink,
    links: intent.links,
  };

  return normalized;
}

function buildAttachmentInput(attachments: AdminAiAttachment[]): ResponseInputContent[] {
  return attachments.map((attachment) => {
    if (attachment.kind === "image") {
      return {
        type: "input_image",
        detail: "auto",
        image_url: attachment.dataUrl,
      } satisfies ResponseInputContent;
    }

    return {
      type: "input_file",
      file_data: attachment.dataUrl,
      filename: attachment.name,
    } satisfies ResponseInputContent;
  });
}

function buildResponseInput(messages: AdminAiMessage[], attachments: AdminAiAttachment[]): ResponseInput {
  const recentMessages = messages.slice(-MAX_MESSAGES);
  const lastUserMessageIndex = recentMessages.map((message) => message.role).lastIndexOf("user");

  return recentMessages.map((message, index) => {
    if (index === lastUserMessageIndex && attachments.length > 0) {
      const content: ResponseInputContent[] = [
        {
          type: "input_text",
          text: trimContent(message.content),
        },
        ...buildAttachmentInput(attachments),
      ];

      return {
        role: "user",
        content,
      } satisfies EasyInputMessage;
    }

    return {
      role: message.role,
      content: [
        {
          type: "input_text",
          text: trimContent(message.content),
        },
      ],
    } satisfies EasyInputMessage;
  });
}

function buildGuideContent(guide: AdminAiGuide) {
  const stepText = guide.steps.map((step, index) => `${index + 1}. ${step}`).join(" ");
  const noteText = guide.note ? ` Note: ${guide.note}` : "";
  return `${guide.intro} ${stepText}${noteText}`.trim();
}

function compactJson(value: unknown) {
  return JSON.stringify(value);
}

export function buildAdminAssistantInstructions(
  context: AdminAiContext,
  attachments: AdminAiAttachment[] = [],
  guideIntent: AdminGuideIntent = resolveAdminGuideIntent([], context),
  guideMetadata: AdminGuideMetadata = buildAdminGuideMetadata(context)
) {
  const pageEditor = context.pageEditor
    ? [
        `Page editor page key: ${context.pageEditor.pageKey ?? "unknown"}`,
        `Page editor title: ${context.pageEditor.title ?? "unknown"}`,
        `Page editor slug: ${context.pageEditor.slug ?? "unknown"}`,
        `Template key: ${context.pageEditor.pageTemplateKey ?? "unknown"}`,
        `Allowed block types: ${(context.pageEditor.allowedBlockTypes ?? []).join(", ") || "unknown"}`,
        `Current block types: ${(context.pageEditor.blockTypes ?? []).join(", ") || "none"}`,
      ].join("\n")
    : "No page editor metadata is active.";
  const availableBlockTypes = getAvailableBlockTypes(guideMetadata);

  return [
    "You are the DSGNFI CMS admin guide.",
    "You help authenticated admins understand how to operate the admin interface.",
    "You are read-only: you cannot edit pages, publish content, create sites, upload assets, or change settings.",
    "If a user asks you to perform an action, explain the exact UI steps instead of claiming you did it.",
    "Keep answers concise, practical, and specific to the current screen when context is available.",
    "Return valid JSON that follows the schema exactly.",
    "The server has already selected deterministic destination links for this request.",
    "Explain the steps and why the selected screen is appropriate, but do not invent destination links.",
    "Use the deterministic links listed below if you mention a destination.",
    "Use uploaded files only as supporting context for your explanation.",
    "",
    "Admin areas available:",
    "- Dashboard: /admin",
    "- Sites: /admin/sites",
    "- Templates: /admin/templates",
    "- Pages: /admin/pages",
    "- Site Settings: /admin/site-settings",
    "- Work: /admin/work",
    "- Process: /admin/process",
    "",
    "Current admin context:",
    `Route: ${context.route}`,
    `Screen: ${context.screenTitle}`,
    `Tenant: ${context.tenantName ?? "unknown"}`,
    `Site: ${context.siteName ?? "unknown"}`,
    `Role: ${context.role ?? "unknown"}`,
    pageEditor,
    `Available block types: ${availableBlockTypes.join(", ") || "unknown"}`,
    "",
    "Detected guide intent:",
    compactJson({
      id: guideIntent.id,
      label: guideIntent.label,
      primaryLink: guideIntent.primaryLink,
      links: guideIntent.links,
      routeHints: guideIntent.routeHints,
    }),
    "",
    "Guide metadata JSON:",
    compactJson(guideMetadata),
    "",
    "Allowed admin links for this answer:",
    ...guideIntent.links.map((route) => `- ${route.label}: ${route.href}`),
    "",
    "All known safe admin routes:",
    ...getAllowedRouteSummary(context).map((route) => `- ${route}`),
    "",
    "Uploaded files:",
    getAttachmentSummary(attachments),
  ].join("\n");
}

export async function createAdminAiReply(options: {
  adminId: string;
  messages: AdminAiMessage[];
  context: AdminAiContext;
  attachments?: AdminAiAttachment[];
}) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new MissingOpenAIKeyError();
  }

  const attachments = options.attachments ?? [];
  const guideMetadata = buildAdminGuideMetadata(options.context);
  const guideIntent = resolveAdminGuideIntent(options.messages, options.context);
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: getOpenAiModel(),
    instructions: buildAdminAssistantInstructions(options.context, attachments, guideIntent, guideMetadata),
    input: buildResponseInput(options.messages, attachments),
    max_output_tokens: 900,
    store: false,
    safety_identifier: hashAdminId(options.adminId),
    text: {
      format: guideResponseSchema,
    },
  });

  const parsed = (() => {
    try {
      return JSON.parse(response.output_text ?? "") as Partial<AdminAiGuide>;
    } catch {
      return null;
    }
  })();

  const guide = sanitizeGuide(parsed, options.context, guideIntent);
  return {
    content: buildGuideContent(guide),
    guide,
    intent: guideIntent,
  };
}
