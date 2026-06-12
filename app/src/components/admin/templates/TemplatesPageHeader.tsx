type TemplatesPageHeaderProps = {
  canManageTemplates: boolean;
  onCreateTemplate: () => void;
  onImportTemplate: () => void;
  onOpenGuidance: () => void;
};

export function TemplatesPageHeader({
  canManageTemplates,
  onCreateTemplate,
  onImportTemplate,
  onOpenGuidance,
}: TemplatesPageHeaderProps) {
  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-emerald-300/75">
          Admin workspace
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white">
          Templates
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/58">
          Browse starter presets, inspect defaults, and create reusable custom templates.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCreateTemplate}
          disabled={!canManageTemplates}
          className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create template
        </button>
        <button
          type="button"
          onClick={onImportTemplate}
          disabled={!canManageTemplates}
          className="inline-flex cursor-pointer items-center justify-center rounded-full border border-orange-200/25 px-5 py-3 text-sm text-orange-100 transition hover:border-orange-100/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import bundle
        </button>
        <button
          type="button"
          onClick={onOpenGuidance}
          className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/12 px-5 py-3 text-sm text-white/72 transition hover:border-white/35 hover:text-white"
        >
          Template safety rules
        </button>
      </div>
    </section>
  );
}
