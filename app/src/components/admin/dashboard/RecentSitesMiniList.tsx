import type { DashboardRecentSite } from "../../../services/adminDashboard";

type RecentSitesMiniListProps = {
  sites: DashboardRecentSite[];
  switchingSiteId: string | null;
  onSwitchSite: (siteId: string) => void;
};

function statusClass(status: string) {
  return status === "ACTIVE"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
    : "border-white/12 bg-white/[0.04] text-white/70";
}

export function RecentSitesMiniList({
  sites,
  switchingSiteId,
  onSwitchSite,
}: RecentSitesMiniListProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.34em] text-white/42">
          Recent sites
        </p>
        <h3 className="mt-4 text-xl font-semibold text-white">Jump back in quickly</h3>
      </div>

      {sites.length > 0 ? (
        <div className="mt-5 space-y-3">
          {sites.map((site) => (
            <div key={site.id} className="rounded-[1.4rem] bg-black/28 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">{site.name}</p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${statusClass(site.status)}`}
                    >
                      {site.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/62">
                    Last edited {new Date(site.lastEditedAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/46">
                    Next: {site.nextActionLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSwitchSite(site.id)}
                  disabled={switchingSiteId === site.id}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/76 transition hover:border-white/40 hover:text-white disabled:opacity-45"
                >
                  {switchingSiteId === site.id ? "Switching..." : "Switch site"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm leading-relaxed text-white/60">
          No other recently edited sites are available right now.
        </p>
      )}
    </section>
  );
}
