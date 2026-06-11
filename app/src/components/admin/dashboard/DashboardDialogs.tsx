import { ArrowRight, Check, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";
import type {
  DashboardIssue,
  DashboardReadinessItem,
  DashboardSummary,
} from "../../../services/adminDashboard";

type ChecklistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: DashboardSummary | null;
};

type ActivityDialogProps = ChecklistDialogProps;

type IssuesDrawerProps = ChecklistDialogProps;

type SiteSwitcherDialogProps = ChecklistDialogProps & {
  switchingSiteId: string | null;
  onSwitchSite: (siteId: string) => void;
};

type TemplateDetailsDialogProps = ChecklistDialogProps;

function readinessStateClass(item: DashboardReadinessItem) {
  switch (item.state) {
    case "complete":
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
    case "warning":
      return "border-amber-300/25 bg-amber-300/10 text-amber-100";
    case "blocked":
      return "border-rose-300/25 bg-rose-400/10 text-rose-100";
    default:
      return "border-white/12 bg-white/[0.04] text-white/70";
  }
}

function issueClass(issue: DashboardIssue) {
  return issue.severity === "blocked"
    ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
    : "border-amber-300/25 bg-amber-300/10 text-amber-100";
}

function DetailAction({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs text-white/78 transition hover:border-white/40 hover:text-white"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

export function ChecklistDialog({ open, onOpenChange, summary }: ChecklistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-y-auto border-white/10 bg-neutral-950 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Setup checklist</DialogTitle>
          <DialogDescription className="text-white/58">
            {summary
              ? `${summary.readiness.completedCount} of ${summary.readiness.totalCount} complete`
              : "No checklist available."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {summary?.readiness.items.map((item) => (
            <div
              key={item.key}
              className="grid gap-3 rounded-lg border border-white/8 bg-white/[0.03] p-4 md:grid-cols-[24px_1fr_auto] md:items-center"
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border ${readinessStateClass(item)}`}
              >
                {item.state === "complete" ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="mt-1 text-sm text-white/60">{item.helper}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${readinessStateClass(item)}`}
                >
                  {item.state.replace("_", " ")}
                </span>
                {item.action ? <DetailAction to={item.action.to} label={item.action.label} /> : null}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ActivityDialog({ open, onOpenChange, summary }: ActivityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-y-auto border-white/10 bg-neutral-950 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Activity log</DialogTitle>
          <DialogDescription className="text-white/58">
            Latest operational events for the active site.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {summary?.recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/8 bg-white/[0.03] p-4"
            >
              <div>
                <p className="text-sm font-medium text-white">{activity.summary}</p>
                <p className="mt-1 text-sm text-white/54">
                  {new Date(activity.timestamp).toLocaleString()}
                  {activity.actor ? ` by ${activity.actor}` : ""}
                </p>
              </div>
              <DetailAction to={activity.to} label="Open" />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function IssuesDrawer({ open, onOpenChange, summary }: IssuesDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[92vw] border-white/10 bg-neutral-950 p-0 text-white sm:max-w-xl">
        <SheetHeader className="border-b border-white/10 p-6">
          <SheetTitle>Warnings and blockers</SheetTitle>
          <SheetDescription className="text-white/58">
            Items that need attention before the site is launch-ready.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 overflow-y-auto p-6">
          {summary && summary.issues.length > 0 ? (
            summary.issues.map((issue) => (
              <div key={issue.id} className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${issueClass(issue)}`}
                  >
                    {issue.severity}
                  </span>
                  <p className="text-sm font-medium text-white">{issue.title}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/62">{issue.helper}</p>
                {issue.action ? (
                  <div className="mt-4">
                    <DetailAction to={issue.action.to} label={issue.action.label} />
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-sm font-medium text-white">Site healthy</p>
              <p className="mt-2 text-sm text-white/62">No active warnings or blockers.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SiteSwitcherDialog({
  open,
  onOpenChange,
  summary,
  switchingSiteId,
  onSwitchSite,
}: SiteSwitcherDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-y-auto border-white/10 bg-neutral-950 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Switch site</DialogTitle>
          <DialogDescription className="text-white/58">
            Recently edited sites in this tenant.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {summary?.recentSites.map((site) => (
            <div
              key={site.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/8 bg-white/[0.03] p-4"
            >
              <div>
                <p className="text-sm font-medium text-white">{site.name}</p>
                <p className="mt-1 text-sm text-white/54">
                  {site.status} / {new Date(site.lastEditedAt).toLocaleString()} / {site.nextActionLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSwitchSite(site.id)}
                disabled={switchingSiteId === site.id}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/78 transition hover:border-white/40 hover:text-white disabled:opacity-45"
              >
                {switchingSiteId === site.id ? "Switching..." : "Switch site"}
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TemplateDetailsDialog({
  open,
  onOpenChange,
  summary,
}: TemplateDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-neutral-950 text-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{summary?.templateShortcut.title ?? "Template details"}</DialogTitle>
          <DialogDescription className="text-white/58">
            {summary?.templateShortcut.helper ?? "No template summary is available."}
          </DialogDescription>
        </DialogHeader>
        {summary ? (
          <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-white/62">Current site</p>
            <p className="mt-2 text-lg font-medium text-white">{summary.currentSite.name}</p>
            <p className="mt-4 text-sm text-white/62">Template</p>
            <p className="mt-2 text-lg font-medium text-white">{summary.currentSite.templateName}</p>
            <div className="mt-5">
              <DetailAction
                to={summary.templateShortcut.action.to}
                label={summary.templateShortcut.action.label}
              />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
