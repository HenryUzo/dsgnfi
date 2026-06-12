import { Link } from "react-router-dom";

import type { TemplateDetail, TemplateSummary } from "../../../services/adminSites";
import { TemplateHomepageThumbnail } from "./TemplateHomepageThumbnail";
import { TemplateModuleChips } from "./TemplateModuleChips";
import { TemplateVersionBadge } from "./TemplateBadges";
import {
  getEditableGroups,
  getIncludedPages,
  getNavigationLabels,
  getTemplateModules,
  getTemplateStatus,
  getTemplateType,
  getTemplateVersion,
} from "./templatePresentation";

type SelectedTemplateInspectorProps = {
  summary: TemplateSummary | null;
  detail: TemplateDetail | null;
  loading: boolean;
  usageCount: number;
  onUseTemplate: (templateKey: string) => void;
  onCreateCustomCopy: (templateKey: string) => void;
  onViewUsage: () => void;
  onEditCustomTemplate: () => void;
  variant?: "panel" | "drawer";
};

export function SelectedTemplateInspector({
  summary,
  detail,
  loading,
  usageCount,
  onUseTemplate,
  onCreateCustomCopy,
  onViewUsage,
  onEditCustomTemplate,
  variant = "panel",
}: SelectedTemplateInspectorProps) {
  const template = detail ?? summary;
  const surfaceClass =
    variant === "drawer"
      ? "h-full overflow-y-auto px-6 pb-6 pt-2"
      : "rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 xl:sticky xl:top-6";

  return (
    <aside className={surfaceClass}>
      {loading ? (
        <p className="text-sm text-white/58">Loading selected template...</p>
      ) : template ? (
        <div>
          <p className="text-xs font-medium text-white/45">Selected template</p>
          <div className="mt-4">
            <TemplateHomepageThumbnail template={template} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
              {getTemplateType(template)}
            </span>
            <TemplateVersionBadge status={getTemplateStatus(template)} />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">{template.name}</h2>
          <p className="mt-2 text-sm text-white/52">Version {getTemplateVersion(template)}</p>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            {template.description}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
            <div>
              <p className="text-xs text-white/42">Used by</p>
              <p className="mt-1 text-xl font-semibold text-white">{usageCount}</p>
            </div>
            <div>
              <p className="text-xs text-white/42">Type</p>
              <p className="mt-1 text-sm text-white/76">{getTemplateType(template)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-5 border-t border-white/10 pt-5">
            <div>
              <p className="text-xs text-white/42">Included modules</p>
              <div className="mt-3">
                <TemplateModuleChips modules={getTemplateModules(template)} />
              </div>
            </div>
            <div>
              <p className="text-xs text-white/42">Starter pages</p>
              <div className="mt-3">
                <TemplateModuleChips modules={getIncludedPages(detail)} />
              </div>
            </div>
            <div>
              <p className="text-xs text-white/42">Editable groups</p>
              <div className="mt-3">
                <TemplateModuleChips modules={getEditableGroups(detail)} />
              </div>
            </div>
            <div>
              <p className="text-xs text-white/42">Default navigation</p>
              <div className="mt-3">
                <TemplateModuleChips modules={getNavigationLabels(detail)} />
              </div>
            </div>
            <div>
              <p className="text-xs text-white/42">Default settings</p>
              <div className="mt-2 space-y-1 text-sm text-white/58">
                <p>Tagline: {detail?.manifest.starterSiteSettings?.tagline ?? "-"}</p>
                <p>
                  Contact: {detail?.manifest.starterSiteSettings?.contactEmail ?? "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => onUseTemplate(template.key)}
              className="w-full cursor-pointer rounded-full bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Use for new site
            </button>
            {template.sourceType === "CUSTOM" ? (
              <button
                type="button"
                onClick={onEditCustomTemplate}
                className="w-full cursor-pointer rounded-full border border-white/12 px-4 py-3 text-sm text-white/72 transition hover:border-white/35 hover:text-white"
              >
                Edit custom template
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCreateCustomCopy(template.key)}
                className="w-full cursor-pointer rounded-full border border-white/12 px-4 py-3 text-sm text-white/72 transition hover:border-white/35 hover:text-white"
              >
                Create custom copy
              </button>
            )}
            <button
              type="button"
              onClick={onViewUsage}
              className="w-full cursor-pointer rounded-full border border-white/12 px-4 py-3 text-sm text-white/72 transition hover:border-white/35 hover:text-white"
            >
              View usage ({usageCount} sites)
            </button>
            <Link
              to="/admin/sites"
              className="block w-full cursor-pointer rounded-full border border-white/12 px-4 py-3 text-center text-sm text-white/72 transition hover:border-white/35 hover:text-white"
            >
              Preview template
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/58">Select a template to inspect defaults.</p>
      )}
    </aside>
  );
}
