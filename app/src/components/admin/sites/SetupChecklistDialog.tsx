import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import { Link } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import type { AdminSite, AdminSiteDetail } from "../../../services/adminSites";
import {
  getCurrentSiteActions,
  getSetupChecklist,
  type SetupItemState,
} from "./sitePresentation";

type SetupChecklistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: AdminSite | AdminSiteDetail | null;
};

function itemStateClasses(state: SetupItemState) {
  switch (state) {
    case "complete":
      return {
        icon: CheckCircle2,
        badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
        label: "Complete",
        iconClass: "text-emerald-100",
      };
    case "blocked":
      return {
        icon: CircleDashed,
        badge: "border-white/12 bg-white/[0.04] text-white/62",
        label: "Blocked",
        iconClass: "text-white/60",
      };
    default:
      return {
        icon: AlertTriangle,
        badge: "border-amber-300/25 bg-amber-300/10 text-amber-100",
        label: "Needs action",
        iconClass: "text-amber-100",
      };
  }
}

export function SetupChecklistDialog({
  open,
  onOpenChange,
  site,
}: SetupChecklistDialogProps) {
  const actions = getCurrentSiteActions(site);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#0b0b0b] text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Setup checklist</DialogTitle>
          <DialogDescription className="text-white/55">
            Launch readiness for {site?.name ?? "the current site"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {getSetupChecklist(site).map((item) => {
            const state = itemStateClasses(item.state);
            const Icon = state.icon;

            return (
              <div
                key={item.key}
                className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${state.iconClass}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${state.badge}`}
                    >
                      {state.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-white/56">{item.helper}</p>
                  {item.action ? (
                    <Link
                      to={item.action.to}
                      onClick={() => onOpenChange(false)}
                      className="mt-3 inline-flex cursor-pointer text-sm text-white/76 transition hover:text-white"
                    >
                      {item.action.label}
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/35 hover:text-white"
          >
            Close
          </button>
          <Link
            to={actions.primary.to}
            onClick={() => onOpenChange(false)}
            className="inline-flex cursor-pointer justify-center rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
          >
            {actions.primary.id === "open_editor" ? "Open editor" : actions.primary.label}
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
