type SiteStatusBadgeProps = {
  status?: string | null;
  current?: boolean;
};

function formatStatus(status?: string | null) {
  if (!status) {
    return "Draft";
  }

  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function SiteStatusBadge({ status, current }: SiteStatusBadgeProps) {
  const active = status === "ACTIVE";

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${
          active
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
            : "border-amber-300/30 bg-amber-300/10 text-amber-100"
        }`}
      >
        {formatStatus(status)}
      </span>
      {current ? (
        <span className="inline-flex rounded-full border border-sky-300/25 bg-sky-300/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-sky-100">
          Current
        </span>
      ) : null}
    </span>
  );
}
