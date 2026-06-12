type ProgressDonutProps = {
  value: number;
  label: string;
};

type StackedBarProps = {
  published: number;
  draft: number;
};

type ActivitySparklineProps = {
  count: number;
};

type HealthIndicatorProps = {
  issuesCount: number;
};

export function ProgressDonut({ value, label }: ProgressDonutProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div
      className="grid h-20 w-20 place-items-center rounded-full"
      style={{
        background: `conic-gradient(rgb(110 231 183) ${normalized}%, rgb(255 255 255 / 0.1) 0)`,
      }}
      aria-label={`${label}: ${normalized}%`}
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-black">
        <span className="text-sm font-semibold text-white">{normalized}%</span>
      </div>
    </div>
  );
}

export function StackedPublishBar({ published, draft }: StackedBarProps) {
  const total = Math.max(1, published + draft);
  const publishedPct = Math.round((published / total) * 100);
  const draftPct = Math.max(0, 100 - publishedPct);

  return (
    <div className="w-24">
      <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
        <div className="bg-emerald-300" style={{ width: `${publishedPct}%` }} />
        <div className="bg-amber-300" style={{ width: `${draftPct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-white/50">
        <span>{published}</span>
        <span>{draft}</span>
      </div>
    </div>
  );
}

export function ActivitySparkline({ count }: ActivitySparklineProps) {
  const heights = Array.from({ length: 7 }, (_, index) => {
    const seed = Math.max(1, count);
    return 18 + ((seed + index * 7) % 28);
  });

  return (
    <div className="flex h-14 w-24 items-end gap-1" aria-label={`${count} recent activity items`}>
      {heights.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="w-full rounded-full bg-white/18"
          style={{ height }}
        />
      ))}
    </div>
  );
}

export function HealthIndicator({ issuesCount }: HealthIndicatorProps) {
  const healthy = issuesCount === 0;

  return (
    <div
      className={`grid h-20 w-20 place-items-center rounded-full border ${
        healthy
          ? "border-emerald-400/25 bg-emerald-400/10"
          : "border-amber-300/25 bg-amber-300/10"
      }`}
      aria-label={healthy ? "Site health healthy" : `${issuesCount} site issues`}
    >
      <span className={healthy ? "text-2xl text-emerald-100" : "text-2xl text-amber-100"}>
        {healthy ? "OK" : issuesCount}
      </span>
    </div>
  );
}
