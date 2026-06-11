import type { ReactNode } from "react";

const statusStyles: Record<string, string> = {
  DRAFT: "border-amber-500/40 text-amber-200 bg-amber-500/10",
  PUBLISHED: "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
};

type SectionCardProps = {
  title: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt?: string | null;
  saving?: boolean;
  publishing?: boolean;
  onSave?: () => void;
  onPublish?: () => void;
  error?: string | null;
  children: ReactNode;
};

export function SectionCard({
  title,
  status,
  publishedAt,
  saving = false,
  publishing = false,
  onSave,
  onPublish,
  error,
  children,
}: SectionCardProps) {
  const dateLabel = publishedAt
    ? new Date(publishedAt).toLocaleString()
    : "Not published yet";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <header className="-mx-6 -mt-6 mb-6 flex flex-col gap-3 rounded-t-2xl border-b border-white/10 bg-black/85 px-6 py-4 backdrop-blur sticky top-[7rem] z-20 md:flex-row md:items-center md:justify-between lg:top-6">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Last published: {dateLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs uppercase tracking-widest border rounded-full px-3 py-1 ${statusStyles[status]}`}
          >
            {status}
          </span>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || publishing}
            className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white hover:border-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={saving || publishing}
            className="rounded-full bg-white text-black px-4 py-2 text-xs uppercase tracking-widest hover:bg-white/90 disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </header>

      <div className="mt-6 space-y-4">{children}</div>

      {error ? (
        <p className="mt-4 text-sm text-red-300">{error}</p>
      ) : null}
    </section>
  );
}
