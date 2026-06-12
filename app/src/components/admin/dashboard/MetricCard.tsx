import type { ReactNode } from "react";

type MetricCardProps = {
  title: string;
  value: string;
  helper?: string;
  visual?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "warning" | "success";
};

function toneClass(tone: MetricCardProps["tone"]) {
  switch (tone) {
    case "warning":
      return "border-amber-300/20 bg-amber-300/[0.04]";
    case "success":
      return "border-emerald-400/20 bg-emerald-400/[0.04]";
    default:
      return "border-white/10 bg-white/[0.035]";
  }
}

export function MetricCard({
  title,
  value,
  helper,
  visual,
  actionLabel,
  onAction,
  tone = "default",
}: MetricCardProps) {
  return (
    <section className={`rounded-lg border p-5 ${toneClass(tone)}`}>
      <div className="flex min-h-28 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-4 text-xl font-semibold text-white">{value}</p>
          {helper ? <p className="mt-2 text-sm leading-relaxed text-white/58">{helper}</p> : null}
        </div>
        {visual ? <div className="shrink-0">{visual}</div> : null}
      </div>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center text-sm text-white/78 transition hover:text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
