import { apiFetch } from "../lib/api";
import type { AdminAiPageContext } from "../components/admin/AdminAiContext";

export type AdminAiGuideLink = {
  label: string;
  href: string;
};

export type AdminAiGuide = {
  intro: string;
  steps: string[];
  note?: string | null;
  why?: string | null;
  intentId?: string | null;
  primaryLink?: AdminAiGuideLink | null;
  links: AdminAiGuideLink[];
};

export type AdminAiAttachmentKind = "image" | "document";

export type AdminAiAttachmentInput = {
  name: string;
  mimeType: string;
  dataUrl: string;
  kind: AdminAiAttachmentKind;
};

export type AdminAiAttachmentPreview = Omit<AdminAiAttachmentInput, "dataUrl">;

export type AdminAiMessage = {
  role: "user" | "assistant";
  content: string;
  guide?: AdminAiGuide | null;
  attachments?: AdminAiAttachmentPreview[];
};

export type AdminAiRequestContext = {
  route: string;
  screenTitle: string;
  tenantName?: string | null;
  siteName?: string | null;
  role?: string | null;
  pageEditor?: AdminAiPageContext["pageEditor"] | null;
};

export async function sendAdminAiChat(input: {
  messages: AdminAiMessage[];
  context: AdminAiRequestContext;
  attachments?: AdminAiAttachmentInput[];
}) {
  const response = await apiFetch<{
    ok: true;
    message: AdminAiMessage;
  }>("/admin/ai/chat", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.message;
}
