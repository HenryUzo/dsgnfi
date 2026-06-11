type ReadinessProgressBarProps = {
  value: number;
  compact?: boolean;
};

function toneClass(value: number) {
  if (value >= 80) {
    return "bg-emerald-400";
  }

  if (value >= 45) {
    return "bg-amber-300";
  }

  return "bg-rose-400";
}

export function ReadinessProgressBar({ value, compact = false }: ReadinessProgressBarProps) {
  const bounded = Math.max(0, Math.min(100, value));

  return (
    <div className="flex items-center gap-2">
      <div
        className={`overflow-hidden rounded-full bg-white/10 ${
          compact ? "h-1.5 w-20" : "h-2 w-full min-w-24"
        }`}
      >
        <div
          className={`h-full rounded-full ${toneClass(bounded)}`}
          style={{ width: `${bounded}%` }}
        />
      </div>
      <span className="shrink-0 text-xs text-white/68">{bounded}%</span>
    </div>
  );
}
