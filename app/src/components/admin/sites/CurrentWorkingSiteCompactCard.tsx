import { ExternalLink, Settings } from "lucide-react";
import { Link } from "react-router-dom";

import type { AdminSite, AdminSiteDetail } from "../../../services/adminSites";
import { SiteStatusBadge } from "./SiteStatusBadge";
import { ReadinessProgressBar } from "./ReadinessProgressBar";
import {
  getCurrentSiteActions,
  getNextStepLabel,
  getSetupProgressPercent,
  getSiteLastEdited,
  getTemplateName,
} from "./sitePresentation";

type CurrentWorkingSiteCompactCardProps = {
  site: AdminSite | AdminSiteDetail | null;
  loading: boolean;
};

export function CurrentWorkingSiteCompactCard({
  site,
  loading,
}: CurrentWorkingSiteCompactCardProps) {
  const actions = getCurrentSiteActions(site);
  const progress = getSetupProgressPercent(site);

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-white/48">Current working site</p>
          {loading && !site ? (
            <p className="mt-4 text-sm text-white/58">Loading current site...</p>
          ) : site ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className="max-w-[22rem] truncate text-2xl font-semibold text-white">
                  {site.name}
                </h2>
                <SiteStatusBadge status={site.status} />
              </div>
              <p className="mt-2 text-sm text-white/50">
                {site.slug} / {getTemplateName(site)}
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-white/58">No current working site.</p>
          )}
        </div>
        {site ? (
          <div className="min-w-[11rem]">
            <p className="text-xs text-white/48">Setup progress</p>
            <div className="mt-2">
              <ReadinessProgressBar value={progress} />
            </div>
          </div>
        ) : null}
      </div>

      {site ? (
        <>
          <div className="mt-5 grid gap-4 border-t border-white/10 pt-4 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs text-white/42">Last edited</p>
              <p className="mt-1 text-white/76">{getSiteLastEdited(site)}</p>
            </div>
            <div>
              <p className="text-xs text-white/42">Next step</p>
              <p className="mt-1 text-white/76">{getNextStepLabel(site)}</p>
            </div>
            <div>
              <p className="text-xs text-white/42">Template</p>
              <p className="mt-1 truncate text-white/76">{getTemplateName(site)}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              to={actions.primary.to}
              className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Open editor
            </Link>
            <Link
              to={actions.secondary[0]?.to ?? "/"}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/72 transition hover:border-white/35 hover:text-white"
            >
              View site
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/admin/site-settings"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/72 transition hover:border-white/35 hover:text-white"
            >
              Settings
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
