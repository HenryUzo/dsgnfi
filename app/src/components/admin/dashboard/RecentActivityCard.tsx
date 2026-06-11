import { Link } from "react-router-dom";

import type { DashboardSummary } from "../../../services/adminDashboard";

type RecentActivityCardProps = {
  summary: DashboardSummary | null;
  loading: boolean;
};

export function RecentActivityCard({ summary, loading }: RecentActivityCardProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.34em] text-white/42">
            Recent activity
          </p>
          <h3 className="mt-4 text-2xl font-semibold text-white">What changed lately</h3>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-white/60">Loading recent activity...</p>
      ) : summary ? (
        <div className="mt-6 space-y-3">
          {summary.recentActivity.map((activity) => (
            <div key={activity.id} className="rounded-[1.6rem] bg-black/28 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/42">
                <span>{new Date(activity.timestamp).toLocaleString()}</span>
                {activity.actor ? <span>by {activity.actor}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-white">{activity.summary}</p>
                <Link
                  to={activity.to}
                  className="text-xs uppercase tracking-[0.22em] text-white/76 transition hover:text-white"
                >
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-white/60">No current site activity to show yet.</p>
      )}
    </section>
  );
}
