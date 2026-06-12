import { useState } from "react";
import { toast } from "sonner";

import {
  importAdminTemplateBundle,
  publishAdminTemplateImport,
  type TemplateDetail,
  type TemplateImportResult,
} from "../../../services/adminSites";

type ImportTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (template: TemplateDetail) => void | Promise<void>;
};

export function ImportTemplateDialog({
  open,
  onOpenChange,
  onImported,
}: ImportTemplateDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TemplateImportResult | null>(null);

  if (!open) {
    return null;
  }

  const handleImport = async () => {
    if (!file) {
      toast.error("Choose a React/Vite zip bundle.");
      return;
    }

    setBusy(true);
    try {
      const imported = await importAdminTemplateBundle(file);
      setResult(imported);
      toast.success("Template bundle mapped into editable blocks.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import template.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!result) {
      return;
    }

    setBusy(true);
    try {
      const template = await publishAdminTemplateImport(result.id);
      await onImported(template);
      toast.success("Imported template published.");
      onOpenChange(false);
      setFile(null);
      setResult(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish imported template.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0b0b] p-6 text-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-orange-200/70">
              React/Vite import
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Import editable template</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
              V1 supports curated React/Vite bundles like Blit Studio. The importer maps
              known sections into editable custom blocks and preserves source metadata.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 hover:border-white/40 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block rounded-2xl border border-dashed border-white/18 bg-white/[0.03] p-5">
            <span className="text-xs uppercase tracking-[0.24em] text-white/45">
              Zip bundle
            </span>
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
              }}
              className="mt-3 block w-full text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black"
            />
            {file ? (
              <p className="mt-3 text-sm text-white/55">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            ) : null}
          </label>

          {!result ? (
            <button
              type="button"
              onClick={handleImport}
              disabled={!file || busy}
              className="rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90 disabled:opacity-50"
            >
              {busy ? "Importing..." : "Map Bundle"}
            </button>
          ) : (
            <div className="space-y-5">
              <section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">
                  Import report
                </p>
                <div className="mt-4 grid gap-3 text-sm text-emerald-50/85 md:grid-cols-2">
                  <p>Routes found: {result.report.routes.length}</p>
                  <p>Pages mapped: {result.report.mappedPages.join(", ")}</p>
                  <p>Sections mapped: {result.report.mappedSections.length}</p>
                  <p>Assets copied: {result.report.copiedAssets.length}</p>
                </div>
                {result.report.warnings.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
                    {result.report.warnings.join(" ")}
                  </div>
                ) : null}
              </section>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={busy}
                  className="rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90 disabled:opacity-50"
                >
                  {busy ? "Publishing..." : "Publish Imported Template"}
                </button>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  disabled={busy}
                  className="rounded-full border border-white/15 px-5 py-3 text-xs uppercase tracking-[0.24em] text-white/70 hover:border-white/40 hover:text-white disabled:opacity-50"
                >
                  Choose Different Bundle
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
