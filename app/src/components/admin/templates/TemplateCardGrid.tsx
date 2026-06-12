import type { TemplateSummary } from "../../../services/adminSites";
import { TemplateCard } from "./TemplateCard";

type TemplateCardGridProps = {
  templates: TemplateSummary[];
  selectedTemplateKey: string | null;
  loading: boolean;
  onSelect: (templateKey: string) => void;
  onUseTemplate: (templateKey: string) => void;
  onCreateTemplate: () => void;
};

export function TemplateCardGrid({
  templates,
  selectedTemplateKey,
  loading,
  onSelect,
  onUseTemplate,
  onCreateTemplate,
}: TemplateCardGridProps) {
  if (loading) {
    return (
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
        <p className="text-sm text-white/58">Loading template library...</p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Template library</h2>
          <p className="mt-1 text-sm text-white/52">
            Browse starter presets and reusable custom templates.
          </p>
        </div>
        <button
          type="button"
          className="cursor-pointer rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/72 transition hover:border-white/35 hover:text-white"
        >
          Compare templates
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/14 bg-black/20 p-6 text-sm text-white/58">
          No templates match this view.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.key}
              template={template}
              selected={template.key === selectedTemplateKey}
              onSelect={onSelect}
              onUseTemplate={onUseTemplate}
            />
          ))}
          <button
            type="button"
            onClick={onCreateTemplate}
            className="flex min-h-48 cursor-pointer items-center gap-4 rounded-[1.25rem] border border-dashed border-white/16 bg-black/20 p-5 text-left transition hover:border-white/35"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full border border-white/16 text-2xl text-white/80">
              +
            </span>
            <span>
              <span className="block text-base font-semibold text-white">
                Create custom template
              </span>
              <span className="mt-1 block text-sm text-white/52">
                Save site structure, defaults, and modules as a reusable preset.
              </span>
            </span>
          </button>
        </div>
      )}
    </section>
  );
}
