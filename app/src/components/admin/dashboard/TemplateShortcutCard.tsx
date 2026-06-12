import { Link } from "react-router-dom";

import type { DashboardSummary } from "../../../services/adminDashboard";

type TemplateShortcutCardProps = {
  summary: DashboardSummary | null;
};

export function TemplateShortcutCard({ summary }: TemplateShortcutCardProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
      <p className="text-[10px] uppercase tracking-[0.34em] text-white/42">
        Template shortcut
      </p>

      {summary ? (
        <>
          <h3 className="mt-4 text-xl font-semibold text-white">
            {summary.templateShortcut.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-white/64">
            {summary.templateShortcut.helper}
          </p>
          <Link
            to={summary.templateShortcut.action.to}
            className="mt-5 inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/78 transition hover:border-white/40 hover:text-white"
          >
            {summary.templateShortcut.action.label}
          </Link>
        </>
      ) : (
        <>
          <h3 className="mt-4 text-xl font-semibold text-white">Template library</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/64">
            Browse starters and custom templates from the dedicated templates page.
          </p>
          <Link
            to="/admin/templates"
            className="mt-5 inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/78 transition hover:border-white/40 hover:text-white"
          >
            Open template library
          </Link>
        </>
      )}
    </section>
  );
}
