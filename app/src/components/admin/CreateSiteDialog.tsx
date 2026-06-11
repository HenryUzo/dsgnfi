import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { ApiError } from "../../lib/api";
import {
  createAdminSite,
  getAdminTemplate,
  getAdminTemplates,
  type AdminSiteDetail,
  type TemplateCategory,
  type TemplateDetail,
  type TemplateSummary,
} from "../../services/adminSites";
import { slugify } from "../../utils/slug";
import { TemplateGallery } from "./TemplateGallery";

const siteSchema = z.object({
  name: z.string().min(1, "Site name is required."),
  slug: z
    .string()
    .min(1, "Slug is required.")
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens."),
  templateKey: z.string().min(1, "Choose a template."),
});

const identitySchema = siteSchema.pick({ name: true, slug: true });

type CreateSiteDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (site: AdminSiteDetail) => Promise<void> | void;
  initialTemplateKey?: string | null;
};

type StepKey = "identity" | "template" | "branding" | "review" | "success";

function issuesToFieldErrors(issues: z.ZodIssue[]) {
  return issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path[0]?.toString() ?? "form";
    acc[key] ??= [];
    acc[key].push(issue.message);
    return acc;
  }, {});
}

export function CreateSiteDialog({
  open,
  onClose,
  onCreated,
  initialTemplateKey = null,
}: CreateSiteDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetail | null>(null);
  const [category, setCategory] = useState<"all" | TemplateCategory>("all");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [step, setStep] = useState<StepKey>("identity");
  const [createdSite, setCreatedSite] = useState<AdminSiteDetail | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setLoadingTemplates(true);
      try {
        const nextTemplates = (await getAdminTemplates()).filter(
          (template) => template.isActive !== false
        );
        if (cancelled) return;
        setTemplates(nextTemplates);
        setSelectedTemplateKey((current) => current ?? initialTemplateKey ?? nextTemplates[0]?.key ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load templates.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTemplates(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialTemplateKey, open]);

  useEffect(() => {
    if (!open || !selectedTemplateKey) {
      setSelectedTemplate(null);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        const detail = await getAdminTemplate(selectedTemplateKey);
        if (!cancelled) {
          setSelectedTemplate(detail);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load template detail.");
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [open, selectedTemplateKey]);

  const focusErrorSummary = () => {
    window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
  };

  const selectedTemplateLabel =
    selectedTemplate?.sourceType === "CUSTOM" ? "Custom preset" : "Starter template";

  const reset = () => {
    setName("");
    setSlug("");
    setTagline("");
    setContactEmail("");
    setSlugTouched(false);
    setTemplates([]);
    setSelectedTemplateKey(null);
    setSelectedTemplate(null);
    setCategory("all");
    setError(null);
    setFieldErrors({});
    setStep("identity");
    setCreatedSite(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateInput = () => {
    const parsed = siteSchema.safeParse({
      name,
      slug,
      templateKey: selectedTemplateKey ?? "",
    });

    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error.issues));
      setError("Please correct the highlighted fields.");
      focusErrorSummary();
      return null;
    }

    setFieldErrors({});
    setError(null);
    return parsed.data;
  };

  const validateIdentity = () => {
    const parsed = identitySchema.safeParse({ name, slug });

    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error.issues));
      setError("Please correct the highlighted fields.");
      focusErrorSummary();
      return false;
    }

    setFieldErrors({});
    setError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = validateInput();
    if (!parsed) return;

    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const site = await createAdminSite(parsed);
      setCreatedSite(site);
      await onCreated(site);
      setStep("success");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to create site.";
      setError(message);
      setFieldErrors(err instanceof ApiError ? err.fieldErrors ?? {} : {});
      focusErrorSummary();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-10 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-3xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Admin Sites</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Create Site</h2>
            <p className="mt-2 text-sm text-white/50">
              {step === "identity"
                ? "Step 1 of 4 - define the site identity."
                : step === "template"
                  ? "Step 2 of 4 - choose a template."
                  : step === "branding"
                    ? "Step 3 of 4 - capture branding basics."
                    : step === "review"
                      ? "Step 4 of 4 - review and create."
                      : "Site created."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/65 hover:border-white/40 hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          {error ? (
            <div
              ref={errorSummaryRef}
              tabIndex={-1}
              role="alert"
              className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100 outline-none"
            >
              <p className="font-semibold">{error}</p>
              {Object.keys(fieldErrors).length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {Object.entries(fieldErrors).flatMap(([field, messages]) =>
                    messages.map((message) => (
                      <li key={`${field}-${message}`}>
                        {field}: {message}
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
          ) : null}

          {step === "template" ? (
            loadingTemplates ? (
              <p className="text-sm text-white/60">Loading templates...</p>
            ) : (
              <TemplateGallery
                templates={templates}
                selectedKey={selectedTemplateKey}
                onSelect={setSelectedTemplateKey}
                selectedTemplate={selectedTemplate}
                detailLoading={loadingDetail}
                category={category}
                onCategoryChange={setCategory}
                selectable
              />
            )
          ) : null}

          {step === "identity" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="site-name" className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Site name
                </label>
                <input
                  id="site-name"
                  value={name}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "site-name-error" : undefined}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!slugTouched) {
                      setSlug(slugify(event.target.value));
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-white/40 focus:outline-none"
                  placeholder="Clinic West"
                />
                {fieldErrors.name ? (
                  <p id="site-name-error" className="text-sm text-red-300">
                    {fieldErrors.name[0]}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label htmlFor="site-slug" className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Slug
                </label>
                <input
                  id="site-slug"
                  value={slug}
                  aria-invalid={Boolean(fieldErrors.slug)}
                  aria-describedby={fieldErrors.slug ? "site-slug-error" : undefined}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(slugify(event.target.value));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-white/40 focus:outline-none"
                  placeholder="clinic-west"
                />
                {fieldErrors.slug ? (
                  <p id="site-slug-error" className="text-sm text-red-300">
                    {fieldErrors.slug[0]}
                  </p>
                ) : null}
                <p className="text-xs text-white/45">Preview URL: /?site={slug || "site-slug"}</p>
              </div>
            </div>
          ) : null}

          {step === "branding" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="site-tagline"
                  className="text-xs uppercase tracking-[0.24em] text-white/45"
                >
                  Tagline
                </label>
                <input
                  id="site-tagline"
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-white/40 focus:outline-none"
                  placeholder={
                    selectedTemplate?.manifest.starterSiteSettings?.tagline ??
                    "Clear, useful site promise"
                  }
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="site-contact-email"
                  className="text-xs uppercase tracking-[0.24em] text-white/45"
                >
                  Contact email
                </label>
                <input
                  id="site-contact-email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-white/40 focus:outline-none"
                  placeholder={
                    selectedTemplate?.manifest.starterSiteSettings?.contactEmail ??
                    "hello@example.com"
                  }
                />
                <p className="text-xs text-white/45">
                  These basics guide setup review. Full branding remains editable in Site Settings.
                </p>
              </div>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">Identity</p>
                <h3 className="mt-3 text-xl font-semibold">{name || "Untitled site"}</h3>
                <p className="mt-1 text-sm text-white/55">{slug || "missing-slug"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">Template</p>
                <h3 className="mt-3 text-xl font-semibold">
                  {selectedTemplate?.name ?? selectedTemplateKey ?? "No template"}
                </h3>
                <p className="mt-1 text-sm text-white/55">
                  {selectedTemplateLabel} / Version{" "}
                  {selectedTemplate?.activeVersion?.version ?? "active"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                  Branding basics
                </p>
                <div className="mt-3 grid gap-3 text-sm text-white/70 md:grid-cols-2">
                  <p>Tagline: {tagline || "Use template default"}</p>
                  <p>Contact email: {contactEmail || "Use template default"}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">What this creates</p>
                <div className="mt-3 grid gap-3 text-sm text-white/70 md:grid-cols-3">
                  <p>
                    Starter nav:{" "}
                    {selectedTemplate?.manifest.starterNavigation?.primary
                      ?.map((item) => (typeof item === "string" ? item : item.label))
                      .join(", ") || "Default"}
                  </p>
                  <p>Process: {selectedTemplate?.manifest.starterContentHints?.processEnabled ? "Enabled" : "Not included"}</p>
                  <p>Work: {selectedTemplate?.manifest.starterContentHints?.workEnabled ? "Enabled" : "Shell only"}</p>
                </div>
                <p className="mt-4 text-sm text-white/55">
                  After creation, review branding, navigation, home content, preview, and publish
                  flow for the new site.
                </p>
              </div>
            </div>
          ) : null}

          {step === "success" ? (
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-100/70">Created</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">
                {createdSite?.name ?? "Site created"}
              </h3>
              <p className="mt-2 text-sm text-white/65">
                Next: configure navigation, edit the home page, generate a preview link, or connect a domain.
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-white/15 px-5 py-3 text-xs uppercase tracking-[0.24em] text-white/70 hover:border-white/40 hover:text-white"
            >
              {step === "success" ? "Close" : "Cancel"}
            </button>
            <div className="flex items-center gap-3">
              {step !== "identity" && step !== "success" ? (
                <button
                  type="button"
                  onClick={() =>
                    setStep(
                      step === "review"
                        ? "branding"
                        : step === "branding"
                          ? "template"
                          : "identity"
                    )
                  }
                  className="rounded-full border border-white/15 px-5 py-3 text-xs uppercase tracking-[0.24em] text-white/70 hover:border-white/40 hover:text-white"
                >
                  Back
                </button>
              ) : null}
              {step === "identity" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (validateIdentity()) setStep("template");
                  }}
                  className="rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90"
                >
                  Continue
                </button>
              ) : null}
              {step === "template" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedTemplateKey) {
                      setFieldErrors({ templateKey: ["Choose a template."] });
                      setError("Please correct the highlighted fields.");
                      focusErrorSummary();
                      return;
                    }
                    setError(null);
                    setFieldErrors({});
                    setStep("branding");
                  }}
                  className="rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90"
                >
                  Continue
                </button>
              ) : null}
              {step === "branding" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (validateInput()) setStep("review");
                  }}
                  className="rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90"
                >
                  Review
                </button>
              ) : null}
              {step === "review" ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Site"}
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
