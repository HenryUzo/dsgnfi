import crypto from "crypto";

import OpenAI from "openai";
import type {
  EasyInputMessage,
  ResponseFormatTextJSONSchemaConfig,
  ResponseInput,
  ResponseInputContent,
} from "openai/resources/responses/responses";

import { env } from "../config/env";

export type AdminAiGuideLink = {
  label: string;
  href: string;
};

export type AdminAiGuide = {
  intro: string;
  steps: string[];
  note?: string | null;
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
    required: ["intro", "steps", "note", "links"],
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
  const trimmed = value.trim();
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

function isAllowedAdminRoute(href: string, context: AdminAiContext) {
  if (!href.startsWith("/admin")) {
    return false;
  }

  const allowedRoutes = getAllowedRouteSummary(context);
  return allowedRoutes.some((route) => href === route || href.startsWith(`${route}/`) || href.startsWith(`${route}?`));
}

function sanitizeGuideLink(link: AdminAiGuideLink, context: AdminAiContext): AdminAiGuideLink | null {
  const label = link.label.trim().replace(/\s+/g, " ");
  const href = link.href.trim();
  if (!label || !href || !isAllowedAdminRoute(href, context)) {
    return null;
  }

  return {
    label: label.slice(0, 48),
    href,
  };
}

function buildFallbackGuide(context: AdminAiContext, content: string): AdminAiGuide {
  const intro =
    content.trim() ||
    `You're on ${context.screenTitle}. Open the linked admin screen and follow the steps there.`;

  return {
    intro,
    steps: ["Open the linked admin screen.", "Use the visible controls on that page to complete the task."],
    note: "This assistant can guide you, but it does not make admin changes itself.",
    links: [
      {
        label: context.screenTitle.startsWith("Admin") ? "Open current screen" : `Open ${context.screenTitle}`,
        href: context.route.startsWith("/admin") ? context.route : "/admin",
      },
    ],
  };
}

function sanitizeGuide(rawGuide: Partial<AdminAiGuide> | null | undefined, context: AdminAiContext): AdminAiGuide {
  if (!rawGuide) {
    return buildFallbackGuide(context, "");
  }

  const intro = typeof rawGuide.intro === "string" ? rawGuide.intro.trim() : "";
  const steps = Array.isArray(rawGuide.steps)
    ? rawGuide.steps.map((step) => step.trim()).filter(Boolean).slice(0, 6)
    : [];
  const note = typeof rawGuide.note === "string" ? rawGuide.note.trim() : null;
  const links = Array.isArray(rawGuide.links)
    ? rawGuide.links
        .map((link) => sanitizeGuideLink(link, context))
        .filter((link): link is AdminAiGuideLink => Boolean(link))
        .slice(0, 3)
    : [];

  const normalized: AdminAiGuide = {
    intro: intro || `You're on ${context.screenTitle}. Follow these steps in the admin UI.`,
    steps: steps.length > 0 ? steps : ["Open the linked admin screen.", "Use the controls on that page to complete the task."],
    note,
    links: links.length > 0 ? links : buildFallbackGuide(context, intro).links,
  };

  return normalized;
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid attachment encoding.");
  }

  return {
    mimeType: match[1] ?? "application/octet-stream",
    base64: match[2] ?? "",
  };
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

    const parsed = parseDataUrl(attachment.dataUrl);
    return {
      type: "input_file",
      detail: "high",
      file_data: parsed.base64,
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

export function buildAdminAssistantInstructions(context: AdminAiContext, attachments: AdminAiAttachment[] = []) {
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

  return [
    "You are the DSGNFI CMS admin guide.",
    "You help authenticated admins understand how to operate the admin interface.",
    "You are read-only: you cannot edit pages, publish content, create sites, upload assets, or change settings.",
    "If a user asks you to perform an action, explain the exact UI steps instead of claiming you did it.",
    "Keep answers concise, practical, and specific to the current screen when context is available.",
    "Return valid JSON that follows the schema exactly.",
    "Always include 1 to 3 internal admin links that take the user to the correct screen.",
    "Links must only use real internal admin routes from the allowed list below.",
    "Use the current route when the user should stay on the current screen.",
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
    "",
    "Allowed admin links for this answer:",
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
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: getOpenAiModel(),
    instructions: buildAdminAssistantInstructions(options.context, attachments),
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

  const guide = sanitizeGuide(parsed, options.context);
  return {
    content: buildGuideContent(guide),
    guide,
  };
}
