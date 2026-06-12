import type { DashboardSummary } from "../../../services/adminDashboard";
import { StatusChecklistItem } from "./StatusChecklistItem";

type SiteReadinessCardProps = {
  summary: DashboardSummary | null;
  loading: boolean;
};

export function SiteReadinessCard({ summary, loading }: SiteReadinessCardProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7">
      <p className="text-[10px] uppercase tracking-[0.34em] text-white/42">
        Setup and publish readiness
      </p>
      <h3 className="mt-4 text-2xl font-semibold text-white">Checklist</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/64">
        Explicit launch checks for the active site. Each row explains what is done,
        what is missing, and where to fix it.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-white/60">Loading readiness details...</p>
      ) : summary ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-white/74">
              {summary.readiness.completedCount} of {summary.readiness.totalCount} complete
            </span>
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-white/58">
              {summary.readiness.publishedPagesCount} published
            </span>
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-white/58">
              {summary.readiness.draftPagesCount} draft
            </span>
          </div>
          <div className="mt-6 space-y-3">
            {summary.readiness.items.map((item) => (
              <StatusChecklistItem key={item.key} item={item} />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm leading-relaxed text-white/60">
          Readiness will appear here after a site is created and selected.
        </p>
      )}
    </section>
  );
}
