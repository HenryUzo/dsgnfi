import {
  ArrowRight,
  Eye,
  FileText,
  Globe2,
  LayoutTemplate,
  ListChecks,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAdmin } from "../../auth/useAdmin";
import { CreateSiteDialog } from "../../components/admin/CreateSiteDialog";
import { DashboardHeader } from "../../components/admin/dashboard/DashboardHeader";
import {
  ActivityDialog,
  ChecklistDialog,
  IssuesDrawer,
  SiteSwitcherDialog,
  TemplateDetailsDialog,
} from "../../components/admin/dashboard/DashboardDialogs";
import {
  ActivitySparkline,
  HealthIndicator,
  ProgressDonut,
  StackedPublishBar,
} from "../../components/admin/dashboard/DashboardVisuals";
import { MetricCard } from "../../components/admin/dashboard/MetricCard";
import { SiteSummaryStrip } from "../../components/admin/dashboard/SiteSummaryStrip";
import {
  getAdminDashboardSummary,
  type DashboardReadinessItem,
  type DashboardSummary,
} from "../../services/adminDashboard";
import type { AdminSiteDetail } from "../../services/adminSites";

type DashboardDialog = "checklist" | "activity" | "sites" | "template" | null;

function getProgressPercent(summary: DashboardSummary | null) {
  if (!summary || summary.readiness.totalCount === 0) {
    return 0;
  }

  return Math.round((summary.readiness.completedCount / summary.readiness.totalCount) * 100);
}

function getReadinessItem(summary: DashboardSummary | null, key: DashboardReadinessItem["key"]) {
  return summary?.readiness.items.find((item) => item.key === key) ?? null;
}

function getIssueCounts(summary: DashboardSummary | null) {
  const issues = summary?.issues ?? [];
  return {
    blocked: issues.filter((issue) => issue.severity === "blocked").length,
    warning: issues.filter((issue) => issue.severity === "warning").length,
    total: issues.length,
  };
}

function getHeaderAction(summary: DashboardSummary | null) {
  if (!summary) {
    return null;
  }

  return {
    label: summary.recommendedAction.id === "review_publish" ? "Review & publish" : "Continue setup",
    to: summary.recommendedAction.to,
  };
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { admin, changeSite } = useAdmin();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<DashboardDialog>(null);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [switchingSiteId, setSwitchingSiteId] = useState<string | null>(null);

  const currentSiteId = admin?.currentSite?.id ?? null;

  useEffect(() => {
    if (!currentSiteId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadSummary = async () => {
      setLoading(true);
      try {
        const nextSummary = await getAdminDashboardSummary(currentSiteId);
        if (!cancelled) {
          setSummary(nextSummary);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [currentSiteId]);

  const headerAction = useMemo(() => getHeaderAction(summary), [summary]);
  const progressPercent = getProgressPercent(summary);
  const domainItem = getReadinessItem(summary, "domain");
  const previewItem = getReadinessItem(summary, "preview");
  const issueCounts = getIssueCounts(summary);
  const activityPreview = summary?.recentActivity.slice(0, 3) ?? [];
  const recentSitesPreview = summary?.recentSites.slice(0, 3) ?? [];

  const handleCreated = async (site: AdminSiteDetail) => {
    await changeSite(site.id);
    toast.success("Site created.");
  };

  const handleSwitchSite = async (siteId: string) => {
    setSwitchingSiteId(siteId);
    try {
      await changeSite(siteId);
      setActiveDialog(null);
      toast.success("Site context updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch site.");
    } finally {
      setSwitchingSiteId(null);
    }
  };

  return (
    <>
      <div className="w-full space-y-7 px-6 py-8">
        <DashboardHeader
          tenantName={admin?.currentTenant?.name}
          currentSiteName={admin?.currentSite?.name}
          role={admin?.currentRole}
          primaryAction={headerAction}
          onCreateSite={currentSiteId ? null : () => setCreateOpen(true)}
        />

        <SiteSummaryStrip
          summary={summary}
          loading={loading}
          onCreateSite={currentSiteId ? null : () => setCreateOpen(true)}
        />

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title="Setup progress"
            value={
              summary
                ? `${summary.readiness.completedCount} of ${summary.readiness.totalCount}`
                : "-"
            }
            helper={
              summary
                ? `${summary.readiness.totalCount - summary.readiness.completedCount} actions left`
                : "No site selected"
            }
            visual={<ProgressDonut value={progressPercent} label="Setup progress" />}
            actionLabel="Open checklist"
            onAction={() => setActiveDialog("checklist")}
            tone={progressPercent === 100 ? "success" : "default"}
          />

          <MetricCard
            title="Publish status"
            value={
              summary
                ? `${summary.readiness.publishedPagesCount} published / ${summary.readiness.draftPagesCount} draft`
                : "-"
            }
            helper={
              summary?.readiness.draftPagesCount
                ? "Draft work is pending review."
                : "Published content is up to date."
            }
            visual={
              <StackedPublishBar
                published={summary?.readiness.publishedPagesCount ?? 0}
                draft={summary?.readiness.draftPagesCount ?? 0}
              />
            }
            actionLabel="View pages"
            onAction={() => {
              navigate("/admin/pages");
            }}
            tone={summary?.readiness.draftPagesCount ? "warning" : "success"}
          />

          <MetricCard
            title="Site health"
            value={issueCounts.total === 0 ? "Healthy" : `${issueCounts.total} item${issueCounts.total === 1 ? "" : "s"}`}
            helper={
              issueCounts.total === 0
                ? "No active blockers or warnings."
                : `${issueCounts.blocked} blocked / ${issueCounts.warning} warning`
            }
            visual={<HealthIndicator issuesCount={issueCounts.total} />}
            actionLabel="View details"
            onAction={() => setIssuesOpen(true)}
            tone={issueCounts.total === 0 ? "success" : "warning"}
          />

          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Domain & preview</p>
                <p className="mt-2 text-sm text-white/58">Public access and review links.</p>
              </div>
              <Globe2 className="h-5 w-5 text-white/46" aria-hidden="true" />
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-black/24 p-3">
                <Globe2 className="mt-0.5 h-4 w-4 text-white/52" aria-hidden="true" />
                <div>
                  <p className="text-sm text-white">{domainItem?.label ?? "Domain connected"}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/52">
                    {domainItem?.helper ?? "No domain data available."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-black/24 p-3">
                <Eye className="mt-0.5 h-4 w-4 text-white/52" aria-hidden="true" />
                <div>
                  <p className="text-sm text-white">{previewItem?.label ?? "Preview generated"}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/52">
                    {previewItem?.helper ?? "No preview data available."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <MetricCard
            title="Activity summary"
            value={`${activityPreview.length} recent`}
            helper={activityPreview[0]?.summary ?? "No recent site activity yet."}
            visual={<ActivitySparkline count={activityPreview.length} />}
            actionLabel="View all activity"
            onAction={() => setActiveDialog("activity")}
          />

          <section
            className={`rounded-lg border p-5 ${
              issueCounts.total > 0
                ? "border-amber-300/20 bg-amber-300/[0.04]"
                : "border-emerald-400/20 bg-emerald-400/[0.04]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-black/30">
                {issueCounts.total > 0 ? (
                  <TriangleAlert className="h-4 w-4 text-amber-100" aria-hidden="true" />
                ) : (
                  <ListChecks className="h-4 w-4 text-emerald-100" aria-hidden="true" />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-white">
                  {issueCounts.total > 0 ? `${issueCounts.total} item needs review` : "Site healthy"}
                </p>
                <p className="mt-1 text-sm text-white/58">
                  {summary?.issues[0]?.title ?? "Everything else looks good."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIssuesOpen(true)}
              className="mt-5 inline-flex items-center gap-2 text-sm text-white/78 transition hover:text-white"
            >
              {issueCounts.total > 0 ? "Review now" : "View details"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </section>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(280px,0.55fr)]">
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Recent activity</p>
                <p className="mt-2 text-sm text-white/58">Latest changes only.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDialog("activity")}
                className="inline-flex items-center gap-2 text-sm text-white/76 transition hover:text-white"
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 grid gap-2">
              {activityPreview.map((activity) => (
                <div
                  key={activity.id}
                  className="grid gap-2 rounded-lg bg-black/24 p-3 text-sm md:grid-cols-[1fr_auto]"
                >
                  <span className="text-white">{activity.summary}</span>
                  <span className="text-white/50">{new Date(activity.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
            <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Recent sites</p>
                  <p className="mt-2 text-sm text-white/58">Top {recentSitesPreview.length} by edits.</p>
                </div>
                <FileText className="h-5 w-5 text-white/42" aria-hidden="true" />
              </div>
              <div className="mt-4 space-y-2">
                {recentSitesPreview.map((site) => (
                  <div key={site.id} className="rounded-lg bg-black/24 p-3">
                    <p className="truncate text-sm text-white">{site.name}</p>
                    <p className="mt-1 text-xs text-white/50">{site.nextActionLabel}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActiveDialog("sites")}
                className="mt-5 inline-flex items-center gap-2 text-sm text-white/76 transition hover:text-white"
              >
                Switch site
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Template</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {summary?.templateShortcut.title ?? "Template library"}
                  </p>
                </div>
                <LayoutTemplate className="h-5 w-5 text-white/42" aria-hidden="true" />
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/58">
                {summary?.templateShortcut.helper ?? "Open the template library for setup options."}
              </p>
              <button
                type="button"
                onClick={() => setActiveDialog("template")}
                className="mt-5 inline-flex items-center gap-2 text-sm text-white/76 transition hover:text-white"
              >
                Template details
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </section>
          </section>
        </section>
      </div>

      <ChecklistDialog
        open={activeDialog === "checklist"}
        onOpenChange={(open) => setActiveDialog(open ? "checklist" : null)}
        summary={summary}
      />
      <ActivityDialog
        open={activeDialog === "activity"}
        onOpenChange={(open) => setActiveDialog(open ? "activity" : null)}
        summary={summary}
      />
      <SiteSwitcherDialog
        open={activeDialog === "sites"}
        onOpenChange={(open) => setActiveDialog(open ? "sites" : null)}
        summary={summary}
        switchingSiteId={switchingSiteId}
        onSwitchSite={(siteId) => void handleSwitchSite(siteId)}
      />
      <TemplateDetailsDialog
        open={activeDialog === "template"}
        onOpenChange={(open) => setActiveDialog(open ? "template" : null)}
        summary={summary}
      />
      <IssuesDrawer open={issuesOpen} onOpenChange={setIssuesOpen} summary={summary} />

      <CreateSiteDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
