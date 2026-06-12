import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import type { DashboardSummary } from "../../../services/adminDashboard";

type SiteSummaryStripProps = {
  summary: DashboardSummary | null;
  loading: boolean;
  onCreateSite?: (() => void) | null;
};

function statusClass(statusLabel: DashboardSummary["currentSite"]["statusLabel"]) {
  if (statusLabel === "Active") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  if (statusLabel === "Needs Attention") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  return "border-white/12 bg-white/[0.04] text-white/72";
}

export function SiteSummaryStrip({ summary, loading, onCreateSite }: SiteSummaryStripProps) {
  if (loading) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.035] px-5 py-5 text-sm text-white/60">
        Loading active site summary...
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.035] px-5 py-5">
        <div>
          <p className="text-sm font-medium text-white">No active site</p>
          <p className="mt-1 text-sm text-white/58">Create a site to start setup.</p>
        </div>
        {onCreateSite ? (
          <button
            type="button"
            onClick={onCreateSite}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm text-black transition hover:bg-white/90"
          >
            Create site
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </section>
    );
  }

  const secondaryAction = summary.currentSite.secondaryActions[0] ?? null;

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] px-5 py-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(180px,1.25fr)_repeat(4,minmax(120px,0.8fr))_minmax(190px,1fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs text-white/42">Active site</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-2xl font-semibold text-white">
              {summary.currentSite.name}
            </h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${statusClass(summary.currentSite.statusLabel)}`}
            >
              {summary.currentSite.statusLabel}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs text-white/42">Template</p>
          <p className="mt-2 truncate text-sm text-white">{summary.currentSite.templateName}</p>
        </div>
        <div>
          <p className="text-xs text-white/42">Progress</p>
          <p className="mt-2 text-sm text-white">{summary.currentSite.progressText}</p>
        </div>
        <div>
          <p className="text-xs text-white/42">Last edited</p>
          <p className="mt-2 text-sm text-white">
            {new Date(summary.currentSite.lastEditedAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/42">Next step</p>
          <p className="mt-2 text-sm text-white">{summary.recommendedAction.label}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Link
            to={summary.currentSite.primaryAction.to}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm text-black transition hover:bg-white/90"
          >
            {summary.currentSite.primaryAction.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {secondaryAction ? (
            <Link
              to={secondaryAction.to}
              className="inline-flex items-center rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/76 transition hover:border-white/40 hover:text-white"
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
