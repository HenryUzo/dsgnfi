import { Link } from "react-router-dom";

type DashboardHeaderProps = {
  tenantName?: string | null;
  currentSiteName?: string | null;
  role?: string | null;
  primaryAction?: {
    label: string;
    to: string;
  } | null;
  onCreateSite?: (() => void) | null;
};

function HeaderChip({ label, value }: { label: string; value?: string | null }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/62">
      {label}: {value ?? "-"}
    </span>
  );
}

export function DashboardHeader({
  tenantName,
  currentSiteName,
  role,
  primaryAction,
  onCreateSite,
}: DashboardHeaderProps) {
  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-3">
        <p className="max-w-2xl text-sm leading-relaxed text-white/64">
          Overview of the active site and recommended next steps.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <HeaderChip label="Tenant" value={tenantName} />
          <HeaderChip label="Current Site" value={currentSiteName} />
          <HeaderChip label="Role" value={role} />
        </div>
      </div>

      {primaryAction ? (
        <Link
          to={primaryAction.to}
          className="inline-flex items-center justify-center self-start rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black transition hover:bg-white/90"
        >
          {primaryAction.label}
        </Link>
      ) : onCreateSite ? (
        <button
          type="button"
          onClick={onCreateSite}
          className="inline-flex items-center justify-center self-start rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black transition hover:bg-white/90"
        >
          Create site
        </button>
      ) : null}
    </section>
  );
}
