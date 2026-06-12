import { Copy, Layers3, PieChart, Sparkles, Star } from "lucide-react";

import type { AdminSite, TemplateSummary } from "../../../services/adminSites";
import { getTemplateStats } from "./templatePresentation";

type TemplateStatsStripProps = {
  templates: TemplateSummary[];
  sites: AdminSite[];
  currentSiteId?: string | null;
  loading: boolean;
};

const iconClass = "inline-flex h-9 w-9 items-center justify-center rounded-2xl border";

export function TemplateStatsStrip({
  templates,
  sites,
  currentSiteId,
  loading,
}: TemplateStatsStripProps) {
  const stats = getTemplateStats(templates, sites, currentSiteId);
  const total = stats.starterTemplatesCount + stats.customTemplatesCount;
  const starterPercent =
    total > 0 ? Math.round((stats.starterTemplatesCount / total) * 100) : 0;
  const customPercent = Math.max(100 - starterPercent, 0);

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] px-5 py-4">
      {loading ? (
        <p className="text-sm text-white/58">Loading template summary...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.4fr_1.4fr]">
          <div className="flex items-center gap-3">
            <span className={`${iconClass} border-violet-300/20 bg-violet-300/10 text-violet-100`}>
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-white/48">Starter templates</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {stats.starterTemplatesCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${iconClass} border-emerald-400/20 bg-emerald-400/10 text-emerald-100`}>
              <Copy className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-white/48">Custom templates</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {stats.customTemplatesCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${iconClass} border-sky-300/20 bg-sky-300/10 text-sky-100`}>
              <Layers3 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-white/48">Templates in use</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {stats.templatesInUseCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${iconClass} border-white/10 bg-white/[0.05] text-white/70`}>
              <Star className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-white/48">Current site template</p>
              <p className="mt-1 truncate text-base font-semibold text-white">
                {stats.currentSiteTemplate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`${iconClass} border-white/10 bg-white/[0.05] text-white/70`}>
              <PieChart className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/48">Starter vs custom</p>
              <div className="mt-2 overflow-hidden rounded-full bg-white/10">
                <div className="flex h-2">
                  <span
                    className="bg-violet-400"
                    style={{ width: `${starterPercent}%` }}
                  />
                  <span
                    className="bg-emerald-400"
                    style={{ width: `${customPercent}%` }}
                  />
                </div>
              </div>
              <p className="mt-2 truncate text-xs text-white/52">
                Most used: {stats.mostUsedTemplate}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
