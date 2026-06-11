import { Link } from "react-router-dom";

import type { AdminSite } from "../../services/adminSites";

type SiteStatusSummary = NonNullable<AdminSite["statusSummary"]>;

const checklistMeta: Array<{
  key: keyof Omit<SiteStatusSummary, "publishedPagesCount" | "nextAction">;
  label: string;
}> = [
  { key: "templateAssigned", label: "Template assigned" },
  { key: "brandingReady", label: "Branding ready" },
  { key: "navigationReady", label: "Navigation ready" },
  { key: "domainReady", label: "Primary domain ready" },
  { key: "previewReady", label: "Preview available" },
];

const nextActionMeta: Record<
  SiteStatusSummary["nextAction"],
  { label: string; to: string; ctaLabel: string }
> = {
  assign_template: {
    label: "Choose a template",
    to: "/admin/templates",
    ctaLabel: "Open Templates",
  },
  edit_branding: {
    label: "Edit branding",
    to: "/admin/site-settings",
    ctaLabel: "Open Site Settings",
  },
  edit_navigation: {
    label: "Review navigation",
    to: "/admin/site-settings",
    ctaLabel: "Open Navigation",
  },
  publish_pages: {
    label: "Publish pages",
    to: "/admin/pages/home",
    ctaLabel: "Open Page Editor",
  },
  connect_domain: {
    label: "Connect domain",
    to: "/admin/site-settings",
    ctaLabel: "Open Domains",
  },
  create_preview: {
    label: "Generate preview",
    to: "/admin/site-settings",
    ctaLabel: "Open Preview Tools",
  },
  edit_home: {
    label: "Edit home page",
    to: "/admin/pages/home",
    ctaLabel: "Open Page Editor",
  },
};

type SiteStatusChecklistProps = {
  summary: SiteStatusSummary | null | undefined;
  compact?: boolean;
};

export function SiteStatusChecklist({
  summary,
  compact = false,
}: SiteStatusChecklistProps) {
  if (!summary) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
        Site readiness is unavailable for this record.
      </div>
    );
  }

  const nextAction = nextActionMeta[summary.nextAction];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className={`grid gap-3 ${compact ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-5"}`}>
        {checklistMeta.map((item) => {
          const ready = Boolean(summary[item.key]);
          return (
            <div
              key={item.key}
              className={`rounded-2xl border px-4 py-3 text-sm ${
                ready
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.03] text-white/60"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.24em] text-current/70">
                {item.label}
              </p>
              <p className="mt-2 font-medium">{ready ? "Ready" : "Needs review"}</p>
            </div>
          );
        })}

        {!compact ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
              Published pages
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {summary.publishedPagesCount}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
            Next recommended task
          </p>
          <p className="mt-1 text-sm text-white">{nextAction.label}</p>
        </div>
        <Link
          to={nextAction.to}
          className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75 hover:border-white/40 hover:text-white"
        >
          {nextAction.ctaLabel}
        </Link>
      </div>
    </div>
  );
}
