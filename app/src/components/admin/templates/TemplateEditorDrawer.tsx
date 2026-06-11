import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";
import {
  publishAdminTemplate,
  updateAdminTemplate,
  type TemplateCategory,
  type TemplateDetail,
} from "../../../services/adminSites";

type TemplateEditorDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateDetail | null;
  usageCount: number;
  onUpdated: (template: TemplateDetail) => Promise<void> | void;
};

export function TemplateEditorDrawer({
  open,
  onOpenChange,
  template,
  usageCount,
  onUpdated,
}: TemplateEditorDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("agency");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !template) {
      return;
    }

    setName(template.name);
    setDescription(template.description);
    setCategory(template.category);
  }, [open, template]);

  const save = async (publish: boolean) => {
    if (!template || template.sourceType !== "CUSTOM") {
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAdminTemplate(template.id, {
        name,
        description,
        category,
        presetOverrides: {},
      });
      const nextTemplate = publish ? await publishAdminTemplate(template.id) : updated;
      await onUpdated(nextTemplate);
      toast.success(publish ? "Template version published." : "Template draft saved.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-white/10 bg-[#0b0b0b] text-white sm:max-w-2xl">
        <SheetHeader className="border-b border-white/10 p-6">
          <SheetTitle className="text-2xl text-white">Template editor</SheetTitle>
          <SheetDescription className="text-white/55">
            Overview, defaults, modules, and version publishing for custom templates.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-6">
          {!template ? (
            <p className="pt-6 text-sm text-white/58">No template selected.</p>
          ) : template.sourceType !== "CUSTOM" ? (
            <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-5 text-sm text-amber-100">
              Starter templates are read-only. Create a custom copy before editing defaults.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
                This template is used by {usageCount} sites. Existing sites are not changed by
                publishing a new version.
              </div>
              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <h3 className="text-lg font-semibold text-white">Overview</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                    placeholder="Template name"
                  />
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as TemplateCategory)}
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  >
                    {["agency", "healthcare", "education", "food", "property", "logistics"].map(
                      (option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      )
                    )}
                  </select>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-28 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none md:col-span-2"
                    placeholder="Description"
                  />
                </div>
              </section>
              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/58">
                <h3 className="text-lg font-semibold text-white">Next editor sections</h3>
                <p className="mt-3">Brand defaults, navigation defaults, starter pages, modules, and preview-before-publish are intentionally isolated in this editor drawer, not the library page.</p>
              </section>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void save(false)}
                  disabled={saving}
                  className="cursor-pointer rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/72 transition hover:border-white/35 hover:text-white disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={() => void save(true)}
                  disabled={saving}
                  className="cursor-pointer rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  Publish version
                </button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
