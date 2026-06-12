import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";
import { Button } from "../../ui/button";
import type {
  AdminSiteDetail,
  TemplateSummary,
} from "../../../services/adminSites";
import {
  getAdminTemplates,
  updateAdminSiteTemplate,
} from "../../../services/adminSites";
import { ReadinessProgressBar } from "./ReadinessProgressBar";
import { SiteStatusBadge } from "./SiteStatusBadge";
import {
  formatSiteTimestamp,
  getCurrentSiteActions,
  getDomainStateLabel,
  getNextStepLabel,
  getSetupChecklist,
  getSetupProgressPercent,
  getTemplateName,
} from "./sitePresentation";

type SiteDetailsDrawerProps = {
  site: AdminSiteDetail | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateUpdated?: (site: AdminSiteDetail) => Promise<void> | void;
};

export function SiteDetailsDrawer({
  site,
  loading,
  open,
  onOpenChange,
  onTemplateUpdated,
}: SiteDetailsDrawerProps) {
  const actions = getCurrentSiteActions(site);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateKey, setTemplateKey] = useState("");
  const [assigningTemplate, setAssigningTemplate] = useState(false);

  useEffect(() => {
    if (!open || !site) {
      setTemplates([]);
      setTemplateKey("");
      setTemplatesLoading(false);
      return;
    }

    let cancelled = false;

    const loadTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const nextTemplates = await getAdminTemplates({ scope: "all" });
        if (!cancelled) {
          setTemplates(nextTemplates.filter((template) => template.isActive !== false));
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load templates."
          );
        }
      } finally {
        if (!cancelled) {
          setTemplatesLoading(false);
        }
      }
    };

    setTemplateKey(site.template?.key ?? "");
    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [open, site]);

  const handleAssignTemplate = async () => {
    if (!site || !templateKey || templateKey === site.template?.key) {
      return;
    }

    setAssigningTemplate(true);
    try {
      const updatedSite = await updateAdminSiteTemplate(site.id, { templateKey });
      setTemplateKey(updatedSite.template?.key ?? "");
      await onTemplateUpdated?.(updatedSite);
      toast.success("Site template updated.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update site template."
      );
    } finally {
      setAssigningTemplate(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-white/10 bg-[#0b0b0b] text-white sm:max-w-xl">
        <SheetHeader className="border-b border-white/10 p-6">
          <SheetTitle className="text-2xl text-white">
            {site?.name ?? "Site details"}
          </SheetTitle>
          <SheetDescription className="text-white/55">
            Site overview, readiness, and operational actions.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-6">
          {loading && !site ? (
            <p className="pt-6 text-sm text-white/58">Loading site details...</p>
          ) : site ? (
            <>
              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SiteStatusBadge status={site.status} />
                    </div>
                    <p className="mt-4 truncate text-sm text-white/50">{site.slug}</p>
                    <p className="mt-2 text-sm text-white/72">{getTemplateName(site)}</p>
                  </div>
                  <div className="min-w-32">
                    <p className="text-xs text-white/42">Readiness</p>
                    <div className="mt-2">
                      <ReadinessProgressBar value={getSetupProgressPercent(site)} />
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-white/42">Domain</p>
                    <p className="mt-1 text-white/72">{getDomainStateLabel(site)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/42">Last edited</p>
                    <p className="mt-1 text-white/72">
                      {formatSiteTimestamp(site.updatedAt ?? site.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/42">Next step</p>
                    <p className="mt-1 text-white/72">{getNextStepLabel(site)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/42">Tagline</p>
                    <p className="mt-1 text-white/72">{site.settings?.tagline ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/42">Contact email</p>
                    <p className="mt-1 text-white/72">{site.settings?.contactEmail ?? "-"}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Template foundation</h3>
                    <p className="mt-1 text-sm text-white/52">
                      Reassign the site to any starter or custom template without recreating
                      the site.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs text-white/42">Current template</p>
                    <p className="mt-1 text-sm text-white/78">{getTemplateName(site)}</p>
                  </div>

                  <div>
                    <label
                      htmlFor="site-template-select"
                      className="text-xs uppercase tracking-[0.18em] text-white/42"
                    >
                      Assign template
                    </label>
                    <select
                      id="site-template-select"
                      value={templateKey}
                      onChange={(event) => setTemplateKey(event.target.value)}
                      disabled={templatesLoading || assigningTemplate}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="" disabled>
                        {templatesLoading ? "Loading templates..." : "Choose a template"}
                      </option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.key}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => void handleAssignTemplate()}
                      disabled={
                        templatesLoading ||
                        assigningTemplate ||
                        !templateKey ||
                        templateKey === site.template?.key
                      }
                      className="rounded-full"
                    >
                      {assigningTemplate ? "Applying..." : "Apply template"}
                    </Button>
                    <p className="self-center text-xs text-white/45">
                      Existing content stays in place. Missing starter pages will be added.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <h3 className="text-sm font-semibold text-white">Readiness checklist</h3>
                <div className="mt-4 space-y-3">
                  {getSetupChecklist(site).map((item) => (
                    <div key={item.key} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-white/82">{item.label}</p>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/54">
                          {item.state.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/52">{item.helper}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <h3 className="text-sm font-semibold text-white">Recent activity</h3>
                <div className="mt-4 space-y-3 text-sm text-white/56">
                  <p>Site updated {formatSiteTimestamp(site.updatedAt ?? site.createdAt)}.</p>
                  <p>Template: {getTemplateName(site)}.</p>
                  <p>Domain: {getDomainStateLabel(site)}.</p>
                </div>
              </section>

              <SheetFooter className="px-0 pb-0">
                <div className="flex flex-wrap gap-2">
                <Link
                  to={actions.primary.to}
                  className="inline-flex cursor-pointer justify-center rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  {actions.primary.label}
                </Link>
                <Link
                  to="/admin/site-settings"
                  className="inline-flex cursor-pointer justify-center rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/72 transition hover:border-white/35 hover:text-white"
                >
                  Open settings
                </Link>
                </div>
              </SheetFooter>
            </>
          ) : (
            <p className="pt-6 text-sm text-white/58">This site detail view is unavailable.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
