import { CheckCircle2 } from "lucide-react";

import type { AdminSite, AdminSiteDetail } from "../../../services/adminSites";
import {
  getCompletedSetupCount,
  getSetupChecklist,
  getSiteNeedsActionCount,
} from "./sitePresentation";

type SetupChecklistSummaryCardProps = {
  site: AdminSite | AdminSiteDetail | null;
  onOpenChecklist: () => void;
};

export function SetupChecklistSummaryCard({
  site,
  onOpenChecklist,
}: SetupChecklistSummaryCardProps) {
  const completed = getCompletedSetupCount(site);
  const total = getSetupChecklist(site).length;
  const needsAction = getSiteNeedsActionCount(site);

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/58">
          {needsAction === 0 ? "Ready" : `${needsAction} to review`}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">
        {needsAction === 0 ? "Setup complete" : "Setup needs review"}
      </h3>
      <p className="mt-2 text-sm text-white/58">
        {completed} of {total} launch steps complete.
      </p>
      <button
        type="button"
        onClick={onOpenChecklist}
        className="mt-5 inline-flex cursor-pointer rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/72 transition hover:border-white/35 hover:text-white"
      >
        View checklist
      </button>
    </section>
  );
}
