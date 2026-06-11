import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import {
  createAdminTemplate,
  type AdminSite,
  type TemplateCategory,
  type TemplateDetail,
  type TemplateSummary,
} from "../../../services/adminSites";

type SourceMode = "starter" | "current-site" | "site";
type WizardStep = "source" | "basics" | "defaults" | "review";

type CreateTemplateWizardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateSummary[];
  sites: AdminSite[];
  currentSiteId?: string | null;
  initialSourceTemplateKey?: string | null;
  onCreated: (template: TemplateDetail) => Promise<void> | void;
};

const categoryOptions: TemplateCategory[] = [
  "agency",
  "healthcare",
  "education",
  "food",
  "property",
  "logistics",
];

export function CreateTemplateWizardDialog({
  open,
  onOpenChange,
  templates,
  sites,
  currentSiteId,
  initialSourceTemplateKey,
  onCreated,
}: CreateTemplateWizardDialogProps) {
  const starterTemplates = templates.filter((template) => template.sourceType !== "CUSTOM");
  const currentSite = sites.find((site) => site.id === currentSiteId) ?? null;
  const [step, setStep] = useState<WizardStep>("source");
  const [sourceMode, setSourceMode] = useState<SourceMode>("starter");
  const [sourceTemplateKey, setSourceTemplateKey] = useState("");
  const [sourceSiteId, setSourceSiteId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("agency");
  const [includedDefaults, setIncludedDefaults] = useState({
    pages: true,
    navigation: true,
    branding: true,
    seo: true,
    contact: true,
    theme: true,
    modules: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep("source");
    setSourceMode(initialSourceTemplateKey ? "starter" : "starter");
    setSourceTemplateKey(initialSourceTemplateKey ?? starterTemplates[0]?.key ?? "");
    setSourceSiteId(currentSite?.id ?? sites[0]?.id ?? "");
    setName("");
    setDescription("");
    setCategory("agency");
    setError(null);
  }, [currentSite?.id, initialSourceTemplateKey, open, sites, templates]);

  const selectedSourceLabel =
    sourceMode === "starter"
      ? starterTemplates.find((template) => template.key === sourceTemplateKey)?.name
      : sites.find((site) => site.id === sourceSiteId)?.name;

  const validateSource = () => {
    if (sourceMode === "starter" && !sourceTemplateKey) {
      setError("Choose a starter template source.");
      return false;
    }
    if ((sourceMode === "current-site" || sourceMode === "site") && !sourceSiteId) {
      setError("Choose a site source.");
      return false;
    }

    setError(null);
    return true;
  };

  const validateBasics = () => {
    if (!name.trim() || !description.trim()) {
      setError("Template name and description are required.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleCreate = async () => {
    if (!validateSource() || !validateBasics()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const template = await createAdminTemplate({
        name: name.trim(),
        description: description.trim(),
        category,
        sourceTemplateKey: sourceMode === "starter" ? sourceTemplateKey : undefined,
        sourceSiteId: sourceMode === "starter" ? undefined : sourceSiteId,
      });
      await onCreated(template);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-[#0b0b0b] text-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create template</DialogTitle>
          <DialogDescription className="text-white/55">
            {step === "source"
              ? "Step 1 of 4: choose the source."
              : step === "basics"
                ? "Step 2 of 4: define reusable preset basics."
                : step === "defaults"
                  ? "Step 3 of 4: choose included defaults."
                  : "Step 4 of 4: review and create."}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div role="alert" className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {step === "source" ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { value: "starter", label: "From starter" },
                { value: "current-site", label: "Clone current site" },
                { value: "site", label: "Clone another site" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSourceMode(option.value as SourceMode);
                    if (option.value === "current-site" && currentSite) {
                      setSourceSiteId(currentSite.id);
                    }
                  }}
                  className={`cursor-pointer rounded-2xl border p-4 text-left text-sm transition ${
                    sourceMode === option.value
                      ? "border-white bg-white/10 text-white"
                      : "border-white/10 bg-white/[0.035] text-white/62 hover:border-white/30"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {sourceMode === "starter" ? (
              <select
                value={sourceTemplateKey}
                onChange={(event) => setSourceTemplateKey(event.target.value)}
                className="w-full cursor-pointer rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
              >
                <option value="">Choose a starter template</option>
                {starterTemplates.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={sourceSiteId}
                onChange={(event) => setSourceSiteId(event.target.value)}
                className="w-full cursor-pointer rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
              >
                <option value="">Choose a site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : null}

        {step === "basics" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Template name"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as TemplateCategory)}
              className="cursor-pointer rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should this preset scaffold?"
              className="min-h-28 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none md:col-span-2"
            />
          </div>
        ) : null}

        {step === "defaults" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(includedDefaults).map(([key, checked]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/72"
              >
                <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    setIncludedDefaults((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                />
              </label>
            ))}
          </div>
        ) : null}

        {step === "review" ? (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/66">
            <p>
              Source: <span className="text-white">{selectedSourceLabel ?? "Not selected"}</span>
            </p>
            <p>
              Template: <span className="text-white">{name || "Untitled template"}</span>
            </p>
            <p>
              Category: <span className="text-white">{category}</span>
            </p>
            <p>
              Included defaults:{" "}
              <span className="text-white">
                {Object.entries(includedDefaults)
                  .filter(([, checked]) => checked)
                  .map(([key]) => key)
                  .join(", ")}
              </span>
            </p>
            <p>
              This creates a reusable preset for future site creation. Existing sites are not
              changed.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/35 hover:text-white"
          >
            Cancel
          </button>
          {step !== "source" ? (
            <button
              type="button"
              onClick={() =>
                setStep(
                  step === "review" ? "defaults" : step === "defaults" ? "basics" : "source"
                )
              }
              className="cursor-pointer rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/35 hover:text-white"
            >
              Back
            </button>
          ) : null}
          {step !== "review" ? (
            <button
              type="button"
              onClick={() => {
                if (step === "source" && validateSource()) setStep("basics");
                if (step === "basics" && validateBasics()) setStep("defaults");
                if (step === "defaults") setStep("review");
              }}
              className="cursor-pointer rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={submitting}
              className="cursor-pointer rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create template"}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
