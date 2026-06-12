import { useMemo } from "react";

import type {
  TemplateCategory,
  TemplateDetail,
  TemplateSummary,
} from "../../services/adminSites";
import { TemplateHomepageThumbnail } from "./templates/TemplateHomepageThumbnail";

const categories: Array<{ value: "all" | TemplateCategory; label: string }> = [
  { value: "all", label: "All" },
  { value: "agency", label: "Agency" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "food", label: "Food" },
  { value: "property", label: "Property" },
  { value: "logistics", label: "Logistics" },
];

type TemplateGalleryProps = {
  templates: TemplateSummary[];
  selectedKey: string | null;
  onSelect: (templateKey: string) => void;
  selectedTemplate: TemplateDetail | null;
  detailLoading?: boolean;
  category: "all" | TemplateCategory;
  onCategoryChange: (category: "all" | TemplateCategory) => void;
  selectable?: boolean;
};

function getEnabledPages(template: TemplateDetail | null) {
  if (!template?.manifest?.starterContentHints) {
    return [];
  }

  const pages = ["home", "about", "contact"];

  if (template.manifest.starterContentHints.processEnabled) {
    pages.push("process");
  }

  if (template.manifest.starterContentHints.workEnabled) {
    pages.push("work");
  }

  return pages;
}

function navigationLabel(
  item:
    | string
    | {
        label: string;
      }
)
{
  return typeof item === "string" ? item : item.label;
}

export function TemplateGallery({
  templates,
  selectedKey,
  onSelect,
  selectedTemplate,
  detailLoading = false,
  category,
  onCategoryChange,
  selectable = false,
}: TemplateGalleryProps) {
  const filteredTemplates = useMemo(
    () =>
      category === "all"
        ? templates
        : templates.filter((template) => template.category === category),
    [category, templates]
  );

  const enabledPages = getEnabledPages(selectedTemplate);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((option) => {
            const active = option.value === category;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onCategoryChange(option.value)}
                className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.25em] transition ${
                  active
                    ? "border-white bg-white text-black"
                    : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredTemplates.map((template) => {
            const active = template.key === selectedKey;
            return (
              <button
                key={template.key}
                type="button"
                onClick={() => onSelect(template.key)}
                className={`rounded-2xl border p-5 text-left transition ${
                  active
                    ? "border-white bg-white/10"
                    : "border-white/10 bg-white/5 hover:border-white/30"
                }`}
              >
                <TemplateHomepageThumbnail template={template} />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                      {template.category}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-white/60">
                      {template.sourceType === "CUSTOM" ? "Custom" : "Starter"}
                    </span>
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.28em] text-white/60">
                    {selectable ? (active ? "Selected" : "Choose") : template.usageCount ? `${template.usageCount} sites` : "Details"}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">{template.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  {template.description}
                </p>
                <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/40">
                  <span>{template.activeVersion?.version ?? "No version"}</span>
                  <span>{template.status}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="rounded-2xl border border-white/10 bg-white/5 p-6">
        {detailLoading ? (
          <p className="text-sm text-white/60">Loading template details...</p>
        ) : selectedTemplate ? (
          <div className="space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                {selectedTemplate.category}
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">
                {selectedTemplate.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                {selectedTemplate.description}
              </p>
            </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">
                    Version
                  </p>
                <p className="mt-2 text-sm text-white">
                  {selectedTemplate.activeVersion?.version ?? "Unavailable"}
                </p>
              </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">
                    Template Type
                  </p>
                  <p className="mt-2 text-sm text-white/75">
                    {selectedTemplate.sourceType === "CUSTOM" ? "Custom preset" : "Starter manifest"}
                  </p>
                </div>
              </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">
                Editable Groups
              </p>
              <p className="mt-2 text-sm text-white/75">
                {selectedTemplate.manifest.editableFieldGroups?.join(", ") ??
                  "Not specified"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">
                Starter Navigation
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTemplate.manifest.starterNavigation?.primary?.map((item) => (
                  <span
                    key={navigationLabel(item)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/65"
                  >
                    {navigationLabel(item)}
                  </span>
                )) ?? <span className="text-sm text-white/55">No defaults</span>}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">
                Starter Pages
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {enabledPages.length > 0 ? (
                  enabledPages.map((page) => (
                    <span
                      key={page}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/65"
                    >
                      {page}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-white/55">No page hints</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">
                Starter Site Settings
              </p>
              <div className="mt-3 space-y-2 text-sm text-white/65">
                <p>Tagline: {selectedTemplate.manifest.starterSiteSettings?.tagline ?? "-"}</p>
                <p>
                  Contact email:{" "}
                  {selectedTemplate.manifest.starterSiteSettings?.contactEmail ?? "-"}
                </p>
                <p>Locale: {selectedTemplate.manifest.starterSiteSettings?.locale ?? "-"}</p>
                <p>
                  Timezone: {selectedTemplate.manifest.starterSiteSettings?.timezone ?? "-"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/60">
            Select a template to review its starter navigation, page support, and
            site settings defaults.
          </p>
        )}
      </aside>
    </div>
  );
}
