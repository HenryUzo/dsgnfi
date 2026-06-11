import { Link } from "react-router-dom";

import type { DashboardSummary } from "../../../services/adminDashboard";

type CurrentSiteControlCardProps = {
  summary: DashboardSummary | null;
  loading: boolean;
  onCreateSite?: (() => void) | null;
};

function statusBadgeClass(label: DashboardSummary["currentSite"]["statusLabel"]) {
  if (label === "Active") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  if (label === "Needs Attention") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  return "border-white/12 bg-white/[0.04] text-white/72";
}

export function CurrentSiteControlCard({
  summary,
  loading,
  onCreateSite,
}: CurrentSiteControlCardProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-7">
      <p className="text-[10px] uppercase tracking-[0.34em] text-white/42">
        Current site control
      </p>

      {loading ? (
        <div className="mt-5 space-y-3 text-sm text-white/60">
          <p>Loading the current site control center...</p>
        </div>
      ) : summary ? (
        <>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-3xl font-semibold text-white">{summary.currentSite.name}</h3>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${statusBadgeClass(summary.currentSite.statusLabel)}`}
                >
                  {summary.currentSite.statusLabel}
                </span>
              </div>
              <p className="mt-3 text-sm text-white/66">{summary.currentSite.templateName}</p>
            </div>

            <div className="min-w-[220px] rounded-[1.75rem] bg-black/32 px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">
                Setup progress
              </p>
              <p className="mt-3 text-xl font-semibold text-white">
                {summary.currentSite.progressText}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.6rem] bg-black/28 p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">Template</p>
              <p className="mt-3 text-lg text-white">{summary.currentSite.templateName}</p>
            </div>
            <div className="rounded-[1.6rem] bg-black/28 p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">
                Last edited
              </p>
              <p className="mt-3 text-lg text-white">
                {new Date(summary.currentSite.lastEditedAt).toLocaleString()}
              </p>
            </div>
            <div className="rounded-[1.6rem] bg-black/28 p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">
                Recommended next step
              </p>
              <p className="mt-3 text-lg text-white">{summary.recommendedAction.label}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to={summary.currentSite.primaryAction.to}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black transition hover:bg-white/90"
            >
              {summary.currentSite.primaryAction.label}
            </Link>
            {summary.currentSite.secondaryActions.map((action) => (
              <Link
                key={`${action.id}-${action.to}`}
                to={action.to}
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-xs uppercase tracking-[0.24em] text-white/74 transition hover:border-white/40 hover:text-white"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <h3 className="text-2xl font-semibold text-white">No active site yet</h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/64">
              Create a site to start the setup flow, assign a template, and turn this
              dashboard into the current site control center.
            </p>
          </div>
          {onCreateSite ? (
            <button
              type="button"
              onClick={onCreateSite}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black transition hover:bg-white/90"
            >
              Create site
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
