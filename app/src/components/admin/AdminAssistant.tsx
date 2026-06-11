import {
  ArrowRight,
  CheckCircle2,
  FileText,
  HelpCircle,
  ImageIcon,
  Loader2,
  MapPin,
  Paperclip,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAdmin } from "../../auth/useAdmin";
import { ApiError } from "../../lib/api";
import {
  sendAdminAiChat,
  type AdminAiAttachmentInput,
  type AdminAiAttachmentKind,
  type AdminAiGuide,
  type AdminAiMessage,
} from "../../services/adminAi";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Textarea } from "../ui/textarea";
import { useAdminAiRegisteredContext } from "./AdminAiContext";

const starterPrompts = [
  "How do I publish a page?",
  "How do I edit navigation?",
  "How do I switch the active site?",
];

const quickActions = [
  "Publish a page",
  "Edit navigation",
  "Change branding",
  "Import template",
  "Switch site",
];

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const SUPPORTED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".md", ".rtf"] as const;

function splitGuideContent(content: string): AdminAiGuide {
  const normalized = content.replace(/\s+/g, " ").trim();
  const firstStepIndex = normalized.search(/\b1\.\s+/);

  if (firstStepIndex < 0) {
    return {
      intro: normalized,
      steps: [],
      note: null,
      links: [],
    };
  }

  const intro = normalized.slice(0, firstStepIndex).replace(/[-:\s]+$/, "").trim();
  const stepText = normalized.slice(firstStepIndex);
  const matches = Array.from(stepText.matchAll(/\b\d+\.\s+/g));
  const steps = matches
    .map((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end =
        index + 1 < matches.length ? matches[index + 1]?.index ?? stepText.length : stepText.length;
      return stepText.slice(start, end).trim().replace(/\s+-\s+/g, " - ");
    })
    .filter(Boolean);

  return {
    intro,
    steps,
    note: null,
    links: [],
  };
}

function getAttachmentKind(file: File): AdminAiAttachmentKind | null {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  const lowerName = file.name.toLowerCase();
  if (SUPPORTED_DOCUMENT_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return "document";
  }

  return null;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error(`Could not read ${file.name}.`));
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function buildGuideFromMessage(message: AdminAiMessage, screenTitle: string) {
  const guide = message.guide ?? splitGuideContent(message.content);
  const intro =
    guide.intro.trim() ||
    `You're on ${screenTitle}. Follow these steps in the admin UI.`;

  return {
    intro,
    steps: guide.steps,
    note: guide.note?.trim() || null,
    why: guide.why?.trim() || null,
    intentId: guide.intentId ?? null,
    primaryLink: guide.primaryLink ?? null,
    links: guide.links,
  };
}

function AssistantGuideMessage({
  message,
  screenTitle,
  onNavigate,
}: {
  message: AdminAiMessage;
  screenTitle: string;
  onNavigate: () => void;
}) {
  const guide = buildGuideFromMessage(message, screenTitle);

  return (
    <article className="mr-4 overflow-hidden rounded-3xl border border-white/10 bg-[#111111] text-white shadow-xl shadow-black/25">
      <div className="border-b border-white/10 bg-white/[0.035] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-300">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Guide
          </div>
          <span className="inline-flex max-w-[12rem] items-center gap-1 truncate rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/45">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{screenTitle}</span>
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-white/70">{guide.intro}</p>
      </div>

      {guide.steps.length > 0 ? (
        <ol className="divide-y divide-white/10">
          {guide.steps.map((step, index) => (
            <li key={`${index}-${step.slice(0, 20)}`} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 px-4 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-black">
                {index + 1}
              </span>
              <p className="pt-1 text-sm leading-6 text-white/76">{step}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="px-4 py-4 text-sm leading-6 text-white/76">{message.content}</div>
      )}

      {guide.primaryLink ? (
        <div className="border-t border-white/10 px-4 py-4">
          <Link
            to={guide.primaryLink.href}
            onClick={onNavigate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-400"
          >
            <span>Open this screen</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="mt-2 text-center text-xs text-white/45">{guide.primaryLink.label}</div>
        </div>
      ) : null}

      {guide.why ? (
        <details className="border-t border-white/10 px-4 py-3 text-sm text-white/65">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            Why this screen?
          </summary>
          <p className="mt-2 leading-6">{guide.why}</p>
        </details>
      ) : null}

      {guide.links.length > 0 ? (
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
            Go To
          </div>
          <div className="flex flex-wrap gap-2">
            {guide.links.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                to={link.href}
                onClick={onNavigate}
                className="inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-100 transition hover:border-orange-300/50 hover:bg-orange-500/20"
              >
                <span>{link.label}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-start gap-2 border-t border-white/10 bg-white/[0.025] px-4 py-3 text-xs leading-5 text-white/45">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" aria-hidden="true" />
        <span>{guide.note ?? "This guide is read-only. Use the admin controls to make the change."}</span>
      </div>
    </article>
  );
}

function getAssistantErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 503) {
    return "OpenAI is not configured for this server yet. Add OPENAI_API_KEY on the server to enable AI replies.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "The assistant could not respond right now.";
}

export function AdminAssistant({ title }: { title: string }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const location = useLocation();
  const { admin } = useAdmin();
  const registeredContext = useAdminAiRegisteredContext();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AdminAiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<AdminAiAttachmentInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestContext = useMemo(
    () => ({
      route: `${location.pathname}${location.search}`,
      screenTitle: title,
      tenantName: admin?.currentTenant?.name ?? null,
      siteName: admin?.currentSite?.name ?? null,
      role: admin?.currentRole ?? null,
      pageEditor: registeredContext?.pageEditor ?? null,
    }),
    [
      admin?.currentRole,
      admin?.currentSite?.name,
      admin?.currentTenant?.name,
      location.pathname,
      location.search,
      registeredContext?.pageEditor,
      title,
    ]
  );

  const submitPrompt = async (prompt: string) => {
    const content = prompt.trim();
    if (!content || loading) {
      return;
    }

    const pendingAttachments = attachments;
    const nextMessages: AdminAiMessage[] = [
      ...messages,
      {
        role: "user",
        content,
        attachments: pendingAttachments.map(({ dataUrl: _dataUrl, ...attachment }) => attachment),
      },
    ];

    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setLoading(true);

    try {
      const responseMessage = await sendAdminAiChat({
        messages: nextMessages.map(({ role, content: messageContent }) => ({
          role,
          content: messageContent,
        })),
        context: requestContext,
        attachments: pendingAttachments,
      });
      setMessages((current) => [...current, responseMessage]);
      setAttachments([]);
    } catch (err) {
      setError(getAssistantErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    const availableSlots = MAX_ATTACHMENTS - attachments.length;
    if (availableSlots <= 0) {
      setError(`You can attach up to ${MAX_ATTACHMENTS} files per prompt.`);
      return;
    }

    const nextFiles = files.slice(0, availableSlots);
    try {
      const nextAttachments = await Promise.all(
        nextFiles.map(async (file) => {
          const kind = getAttachmentKind(file);
          if (!kind) {
            throw new Error("Upload images, PDFs, Word documents, Markdown, or text files only.");
          }
          if (file.size > MAX_ATTACHMENT_BYTES) {
            throw new Error(`${file.name} is larger than 4 MB.`);
          }

          return {
            name: file.name,
            mimeType: file.type || (kind === "image" ? "image/*" : "application/octet-stream"),
            dataUrl: await readFileAsDataUrl(file),
            kind,
          } satisfies AdminAiAttachmentInput;
        })
      );

      setAttachments((current) => [...current, ...nextAttachments]);
      setError(null);
    } catch (err) {
      setError(getAssistantErrorMessage(err));
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open AI admin guide"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-orange-400/40 bg-orange-500 text-black shadow-2xl shadow-orange-950/40 transition hover:scale-105 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:ring-offset-2 focus:ring-offset-black"
      >
        <HelpCircle className="h-6 w-6" aria-hidden="true" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full border-white/10 bg-[#0b0b0b] p-0 text-white sm:max-w-lg">
          <SheetHeader className="border-b border-white/10 p-6 pr-12">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-orange-300/80">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              AI guide
            </div>
            <SheetTitle className="text-2xl text-white">Admin assistant</SheetTitle>
            <SheetDescription className="text-white/55">
              Ask how to operate this CMS, follow the guided steps, and jump straight to the right admin screen.
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/65">
                    Ask for step-by-step guidance, upload a screenshot or document if it adds context,
                    then use the suggested admin links to jump to the right screen.
                  </div>
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
                      Quick actions
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {quickActions.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void submitPrompt(prompt)}
                          className="rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-100 transition hover:border-orange-300/45 hover:bg-orange-500/20"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void submitPrompt(prompt)}
                        className="block w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/75 transition hover:border-orange-300/50 hover:text-white"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, index) =>
                  message.role === "user" ? (
                    <div
                      key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                      className="ml-8 rounded-[1.35rem] bg-orange-500 px-4 py-3 text-sm leading-6 text-black"
                    >
                      <p>{message.content}</p>
                      {message.attachments?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.attachments.map((attachment) => (
                            <span
                              key={`${attachment.name}-${attachment.kind}`}
                              className="inline-flex items-center gap-2 rounded-full bg-black/12 px-3 py-1 text-xs font-medium text-black/80"
                            >
                              {attachment.kind === "image" ? (
                                <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              <span>{attachment.name}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <AssistantGuideMessage
                      key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                      message={message}
                      screenTitle={title}
                      onNavigate={() => setOpen(false)}
                    />
                  )
                )
              )}

              {loading ? (
                <div className="mr-8 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/55">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Thinking...
                </div>
              ) : null}

              {error ? (
                <div role="alert" className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}
            </div>

            <form
              className="border-t border-white/10 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitPrompt(draft);
              }}
            >
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask for admin guidance..."
                className="min-h-24 resize-none border-white/10 bg-white/[0.03] text-white placeholder:text-white/35 focus-visible:border-orange-300 focus-visible:ring-orange-300/30"
              />

              {attachments.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachments.map((attachment, index) => (
                    <span
                      key={`${attachment.name}-${index}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/75"
                    >
                      {attachment.kind === "image" ? (
                        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span className="max-w-[12rem] truncate">{attachment.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${attachment.name}`}
                        onClick={() =>
                          setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index))
                        }
                        className="rounded-full text-white/45 transition hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.md,.rtf"
                className="hidden"
                onChange={(event) => {
                  void onFilesSelected(event);
                }}
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMessages([]);
                      setError(null);
                      setDraft("");
                      setAttachments([]);
                    }}
                    className="border-white/10 bg-transparent text-white/65 hover:bg-white/[0.05] hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reset
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || attachments.length >= MAX_ATTACHMENTS}
                    className="border-white/10 bg-transparent text-white/65 hover:bg-white/[0.05] hover:text-white"
                  >
                    <Paperclip className="h-4 w-4" aria-hidden="true" />
                    Add context
                  </Button>
                </div>
                <Button
                  type="submit"
                  disabled={loading || !draft.trim()}
                  className="bg-orange-500 text-black hover:bg-orange-400"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                  Send
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
