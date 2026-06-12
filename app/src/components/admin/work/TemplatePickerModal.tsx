import { projectTemplates, type ProjectTemplate } from "../../../cms/projectTemplates";

type TemplatePickerModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (template: ProjectTemplate) => void;
};

export function TemplatePickerModal({
  open,
  onClose,
  onSelect,
}: TemplatePickerModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl border border-white/15 bg-black p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              New Project
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Select a Template</h3>
            <p className="mt-2 text-sm text-white/60">
              Start with a structure, then customize fields and content in the editor.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white hover:border-white"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {projectTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              className="group rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-white/40 hover:bg-white/10"
            >
              <div className="mb-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-white/20 bg-gradient-to-br from-white/10 to-white/0">
                <span className="text-xs uppercase tracking-[0.25em] text-white/60">
                  {template.previewLabel}
                </span>
              </div>
              <h4 className="text-base font-medium text-white">{template.name}</h4>
              <p className="mt-1 text-sm text-white/60">{template.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
