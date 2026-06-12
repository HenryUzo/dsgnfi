import { Link } from "react-router-dom";

type EditorStatusBarProps = {
  label: string;
  status: string;
  publishedAt?: string | null;
  note?: string | null;
  previewHref?: string | null;
  saveLabel?: string;
  publishLabel?: string;
  onSave?: () => void;
  onPublish?: () => void;
  saving?: boolean;
  publishing?: boolean;
  disableSave?: boolean;
  disablePublish?: boolean;
};

export function EditorStatusBar({
  label,
  status,
  publishedAt = null,
  note = null,
  previewHref = null,
  saveLabel = "Save Draft",
  publishLabel = "Publish",
  onSave,
  onPublish,
  saving = false,
  publishing = false,
  disableSave = false,
  disablePublish = false,
}: EditorStatusBarProps) {
  return (
    <div className="sticky top-[7rem] z-30 mb-6 rounded-3xl border border-white/10 bg-black/85 p-5 backdrop-blur lg:top-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">{label}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/70">
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/75">
              {status}
            </span>
            <span>
              Last published:{" "}
              {publishedAt ? new Date(publishedAt).toLocaleString() : "Not published yet"}
            </span>
          </div>
          {note ? <p className="mt-3 max-w-3xl text-sm text-amber-100/80">{note}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {previewHref ? (
            <Link
              to={previewHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75 hover:border-white/40 hover:text-white"
            >
              Preview
            </Link>
          ) : null}
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saving || disableSave}
              className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75 hover:border-white/40 hover:text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : saveLabel}
            </button>
          ) : null}
          {onPublish ? (
            <button
              type="button"
              onClick={onPublish}
              disabled={publishing || disablePublish}
              className="rounded-full bg-white px-4 py-2 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90 disabled:opacity-50"
            >
              {publishing ? "Publishing..." : publishLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
