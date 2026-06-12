import { SectionCard } from "../../../pages/admin/components/SectionCard";
import type { PublishStatus } from "../../../services/workAdmin";

type PageMetaValue = {
  title: string;
  subtitle: string;
};

type PageMetaTabProps = {
  value: PageMetaValue;
  status: PublishStatus;
  publishedAt: string | null;
  loading: boolean;
  saving: boolean;
  publishing: boolean;
  error: string | null;
  onChange: (value: PageMetaValue) => void;
  onSave: () => void;
  onPublish: () => void;
};

const inputClassName =
  "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white placeholder:text-white/40 focus:border-white focus:outline-none";

const labelClassName = "text-xs uppercase tracking-widest text-white/50";

export function PageMetaTab({
  value,
  status,
  publishedAt,
  loading,
  saving,
  publishing,
  error,
  onChange,
  onSave,
  onPublish,
}: PageMetaTabProps) {
  return (
    <SectionCard
      title="Work Page Meta"
      status={status}
      publishedAt={publishedAt}
      saving={saving || loading}
      publishing={publishing || loading}
      onSave={onSave}
      onPublish={onPublish}
      error={error}
    >
      <div className="space-y-3">
        <label className={labelClassName}>Title</label>
        <input
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
          className={inputClassName}
          placeholder="Work"
        />
      </div>
      <div className="space-y-3">
        <label className={labelClassName}>Subtitle</label>
        <textarea
          rows={3}
          value={value.subtitle}
          onChange={(event) =>
            onChange({ ...value, subtitle: event.target.value })
          }
          className={inputClassName}
          placeholder="Describe your projects page value proposition."
        />
      </div>
    </SectionCard>
  );
}
