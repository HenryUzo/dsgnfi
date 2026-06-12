import { MoreHorizontal, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import type { AdminSite } from "../../../services/adminSites";
import {
  formatSiteTimestamp,
  getDomainStateLabel,
  getNextStepLabel,
  getSetupProgressPercent,
  getTemplateName,
} from "./sitePresentation";
import { ReadinessProgressBar } from "./ReadinessProgressBar";
import { SiteStatusBadge } from "./SiteStatusBadge";

type TenantSitesTableProps = {
  sites: AdminSite[];
  loading: boolean;
  currentSiteId: string | null | undefined;
  switchingSiteId: string | null;
  onOpenDetails: (siteId: string) => void;
  onRequestSwitchSite: (site: AdminSite) => void;
};

function domainStateClass(state: string) {
  if (state === "Connected") {
    return "text-emerald-100";
  }

  if (state === "Blocked") {
    return "text-rose-100";
  }

  return "text-amber-100";
}

export function TenantSitesTable({
  sites,
  loading,
  currentSiteId,
  switchingSiteId,
  onOpenDetails,
  onRequestSwitchSite,
}: TenantSitesTableProps) {
  const [query, setQuery] = useState("");

  const filteredSites = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return sites;
    }

    return sites.filter((site) => {
      return `${site.name} ${site.slug} ${getTemplateName(site)}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [query, sites]);

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">All tenant sites</h2>
          <p className="mt-1 text-sm text-white/52">
            Compare readiness, inspect details, or switch the working site.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-64 items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-white/70">
            <Search className="h-4 w-4 text-white/38" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sites..."
              className="w-full bg-transparent text-white outline-none placeholder:text-white/36"
            />
          </label>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/68 transition hover:border-white/35 hover:text-white"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-white/58">Loading sites...</p>
      ) : filteredSites.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/58">
          No tenant sites match this search.
        </p>
      ) : (
        <>
          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
            <div className="grid grid-cols-[minmax(300px,1.65fr)_120px_170px_170px_130px_150px] gap-4 bg-white/[0.035] px-4 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-white/36">
              <span>Site</span>
              <span>Status</span>
              <span>Template</span>
              <span>Readiness</span>
              <span>Domain</span>
              <span>Last edited</span>
            </div>
            <div className="divide-y divide-white/10">
              {filteredSites.map((site) => {
                const current = site.id === currentSiteId;
                const domainState = getDomainStateLabel(site);
                const readiness = getSetupProgressPercent(site);
                const nextStep = getNextStepLabel(site);

                return (
                  <div
                    key={site.id}
                    className={`grid grid-cols-[minmax(300px,1.65fr)_120px_170px_170px_130px_150px] gap-4 px-4 py-4 transition ${
                      current ? "bg-emerald-400/[0.055]" : "bg-black/10 hover:bg-white/[0.025]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{site.name}</p>
                      <p className="mt-1 truncate text-xs text-white/45">{site.slug}</p>
                      <p className="mt-3 truncate text-xs uppercase tracking-[0.18em] text-white/38">
                        Next step: {nextStep}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenDetails(site.id)}
                          className="cursor-pointer rounded-full border border-white/12 px-3 py-2 text-xs text-white/72 transition hover:border-white/35 hover:text-white"
                        >
                          Open details
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestSwitchSite(site)}
                          disabled={current || switchingSiteId === site.id}
                          className="cursor-pointer rounded-full border border-white/12 px-3 py-2 text-xs text-white/72 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {current
                            ? "Current site"
                            : switchingSiteId === site.id
                              ? "Switching..."
                              : "Switch site"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <SiteStatusBadge status={site.status} current={current} />
                    </div>
                    <p className="truncate text-sm text-white/70">{getTemplateName(site)}</p>
                    <ReadinessProgressBar value={readiness} compact />
                    <p className={`text-sm ${domainStateClass(domainState)}`}>{domainState}</p>
                    <p className="text-sm text-white/54">
                      {formatSiteTimestamp(site.updatedAt ?? site.createdAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 space-y-3 lg:hidden">
            {filteredSites.map((site) => {
              const current = site.id === currentSiteId;
              const domainState = getDomainStateLabel(site);
              const readiness = getSetupProgressPercent(site);

              return (
                <article
                  key={site.id}
                  className={`rounded-2xl border border-white/10 p-4 ${
                    current ? "bg-emerald-400/[0.055]" : "bg-black/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-white">
                        {site.name}
                      </h3>
                      <p className="mt-1 truncate text-sm text-white/45">{site.slug}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenDetails(site.id)}
                      className="cursor-pointer rounded-full border border-white/12 p-2 text-white/70"
                      aria-label={`Open details for ${site.name}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <SiteStatusBadge status={site.status} current={current} />
                    <span className={`text-sm ${domainStateClass(domainState)}`}>
                      {domainState}
                    </span>
                  </div>
                  <div className="mt-4">
                    <ReadinessProgressBar value={readiness} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDetails(site.id)}
                      className="cursor-pointer rounded-full border border-white/12 px-3 py-2 text-xs text-white/72"
                    >
                      Open details
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestSwitchSite(site)}
                      disabled={current || switchingSiteId === site.id}
                      className="cursor-pointer rounded-full border border-white/12 px-3 py-2 text-xs text-white/72 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {current ? "Current site" : "Switch site"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
