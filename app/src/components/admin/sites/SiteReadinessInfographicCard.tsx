import type { AdminSite } from "../../../services/adminSites";
import { getTenantSiteStats } from "./sitePresentation";

type SiteReadinessInfographicCardProps = {
  sites: AdminSite[];
};

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function SiteReadinessInfographicCard({ sites }: SiteReadinessInfographicCardProps) {
  const stats = getTenantSiteStats(sites);
  const draftPercent = percent(stats.draft, stats.total);
  const activePercent = percent(stats.active, stats.total);
  const blockedPercent = percent(stats.blocked, stats.total);
  const healthy = Math.max(0, 100 - blockedPercent);

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-white/48">Tenant overview</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Site readiness mix</h3>
        </div>
        <div
          className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#34d399 0 ${activePercent}%, #fbbf24 ${activePercent}% ${
              activePercent + draftPercent
            }%, #fb7185 ${activePercent + draftPercent}% ${
              activePercent + draftPercent + blockedPercent
            }%, rgba(255,255,255,0.08) ${
              activePercent + draftPercent + blockedPercent
            }% 100%)`,
          }}
          aria-label={`${healthy}% of tenant site readiness is not blocked`}
        >
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[#0b0b0b] text-center">
            <span className="text-xl font-semibold text-white">{stats.total}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Active
          </span>
          <span className="text-white/58">
            {stats.active} ({activePercent}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-white/70">
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            Draft
          </span>
          <span className="text-white/58">
            {stats.draft} ({draftPercent}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-white/70">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            Blocked
          </span>
          <span className="text-white/58">
            {stats.blocked} ({blockedPercent}%)
          </span>
        </div>
      </div>
    </section>
  );
}
