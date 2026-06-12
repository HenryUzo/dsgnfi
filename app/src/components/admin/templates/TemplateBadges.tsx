type TemplateVersionBadgeProps = {
  status: "Draft" | "Published" | "Deprecated" | string;
};

type TemplateDriftBadgeProps = {
  state: "Synced" | "Slightly changed" | "Heavily customized" | string;
};

export function TemplateVersionBadge({ status }: TemplateVersionBadgeProps) {
  const published = status === "Published";
  const deprecated = status === "Deprecated";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${
        deprecated
          ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
          : published
            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
            : "border-amber-300/25 bg-amber-300/10 text-amber-100"
      }`}
    >
      {status}
    </span>
  );
}

export function TemplateDriftBadge({ state }: TemplateDriftBadgeProps) {
  const synced = state === "Synced";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${
        synced
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
          : "border-amber-300/25 bg-amber-300/10 text-amber-100"
      }`}
    >
      {state}
    </span>
  );
}
