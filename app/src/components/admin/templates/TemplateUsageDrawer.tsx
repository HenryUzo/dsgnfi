import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";
import type { TemplateDetail, TemplateUsageSite } from "../../../services/adminSites";
import { TemplateDriftBadge } from "./TemplateBadges";
import { getDriftState } from "./templatePresentation";

type TemplateUsageDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateDetail | null;
  usages: TemplateUsageSite[];
  loading: boolean;
};

export function TemplateUsageDrawer({
  open,
  onOpenChange,
  template,
  usages,
  loading,
}: TemplateUsageDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-white/10 bg-[#0b0b0b] text-white sm:max-w-xl">
        <SheetHeader className="border-b border-white/10 p-6">
          <SheetTitle className="text-2xl text-white">Template usage</SheetTitle>
          <SheetDescription className="text-white/55">
            Sites using {template?.name ?? "this template"} and their drift status.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 pb-6">
          {loading ? (
            <p className="pt-6 text-sm text-white/58">Loading usage...</p>
          ) : usages.length > 0 ? (
            usages.map((usage) => (
              <article
                key={usage.id}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-white">
                      {usage.name}
                    </h3>
                    <p className="mt-1 truncate text-sm text-white/45">{usage.slug}</p>
                  </div>
                  <TemplateDriftBadge state={getDriftState(usage)} />
                </div>
                <div className="mt-4 grid gap-3 text-sm text-white/58 sm:grid-cols-2">
                  <p>Status: {usage.status}</p>
                  <p>Version: {usage.templateVersion?.version ?? "No version"}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="/admin/sites"
                    className="rounded-full border border-white/12 px-3 py-2 text-xs text-white/72 transition hover:border-white/35 hover:text-white"
                  >
                    Open site
                  </a>
                  <button
                    type="button"
                    className="cursor-pointer rounded-full border border-white/12 px-3 py-2 text-xs text-white/72 transition hover:border-white/35 hover:text-white"
                  >
                    Compare drift
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="pt-6 text-sm text-white/58">
              No sites are using this template yet.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
