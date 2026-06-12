import { Link } from "react-router-dom";

import type { DashboardIssue, DashboardSummary } from "../../../services/adminDashboard";

type SiteIssuesCardProps = {
  summary: DashboardSummary | null;
  loading: boolean;
};

function severityClass(issue: DashboardIssue) {
  if (issue.severity === "blocked") {
    return "border-rose-300/25 bg-rose-400/10 text-rose-100";
  }

  return "border-amber-300/25 bg-amber-300/10 text-amber-100";
}

export function SiteIssuesCard({ summary, loading }: SiteIssuesCardProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7">
      <p className="text-[10px] uppercase tracking-[0.34em] text-white/42">Issues</p>
      <h3 className="mt-4 text-2xl font-semibold text-white">Blockers and warnings</h3>

      {loading ? (
        <p className="mt-6 text-sm text-white/60">Loading issue checks...</p>
      ) : summary ? (
        summary.issues.length > 0 ? (
          <div className="mt-6 space-y-3">
            {summary.issues.map((issue) => (
              <div key={issue.id} className="rounded-[1.6rem] bg-black/28 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${severityClass(issue)}`}
                  >
                    {issue.severity === "blocked" ? "Blocked" : "Warning"}
                  </span>
                  <p className="text-sm font-medium text-white">{issue.title}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/68">{issue.helper}</p>
                {issue.action ? (
                  <Link
                    to={issue.action.to}
                    className="mt-3 inline-flex items-center text-xs uppercase tracking-[0.22em] text-white/78 transition hover:text-white"
                  >
                    {issue.action.label}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.6rem] bg-emerald-400/10 px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/80">
              Site healthy
            </p>
            <p className="mt-3 text-lg font-medium text-white">
              No blockers are holding this site back.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/72">
              Next optimization: keep refining live content from the editor and review
              the public experience after each publish cycle.
            </p>
            <Link
              to={summary.recommendedAction.to}
              className="mt-4 inline-flex items-center text-xs uppercase tracking-[0.22em] text-white/84 transition hover:text-white"
            >
              {summary.recommendedAction.label}
            </Link>
          </div>
        )
      ) : (
        <p className="mt-6 text-sm text-white/60">Issue checks appear after a site is selected.</p>
      )}
    </section>
  );
}
