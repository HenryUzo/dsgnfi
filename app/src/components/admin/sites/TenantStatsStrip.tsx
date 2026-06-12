import { AlertTriangle, CheckCircle2, Clock3, LayoutPanelTop, PieChart } from "lucide-react";

import type { AdminSite } from "../../../services/adminSites";
import { getTenantSiteStats } from "./sitePresentation";
import { ReadinessProgressBar } from "./ReadinessProgressBar";

type TenantStatsStripProps = {
  sites: AdminSite[];
  loading: boolean;
};

const statIconClass = "inline-flex h-9 w-9 items-center justify-center rounded-2xl border";

export function TenantStatsStrip({ sites, loading }: TenantStatsStripProps) {
  const stats = getTenantSiteStats(sites);

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] px-5 py-4">
      {loading ? (
        <p className="text-sm text-white/58">Loading tenant summary...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="flex items-center gap-3">
            <span className={`${statIconClass} border-emerald-400/20 bg-emerald-400/10 text-emerald-100`}>
              <LayoutPanelTop className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-white/48">Total sites</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.total}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${statIconClass} border-emerald-400/20 bg-emerald-400/10 text-emerald-100`}>
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-white/48">Active</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.active}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${statIconClass} border-amber-300/20 bg-amber-300/10 text-amber-100`}>
              <Clock3 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-white/48">Draft</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.draft}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${statIconClass} border-rose-400/20 bg-rose-400/10 text-rose-100`}>
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-white/48">Blocked</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.blocked}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${statIconClass} border-violet-300/20 bg-violet-300/10 text-violet-100`}>
              <PieChart className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/48">Avg. setup progress</p>
              <div className="mt-2">
                <ReadinessProgressBar value={stats.averageProgress} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
