import type { TemplateSummary } from "../../../services/adminSites";
import { TemplateHomepageThumbnail } from "./TemplateHomepageThumbnail";
import { TemplateModuleChips } from "./TemplateModuleChips";
import { TemplateVersionBadge } from "./TemplateBadges";
import {
  formatTemplateCategory,
  getTemplateModules,
  getTemplateStatus,
  getTemplateType,
  getTemplateVersion,
} from "./templatePresentation";

type TemplateCardProps = {
  template: TemplateSummary;
  selected: boolean;
  onSelect: (templateKey: string) => void;
  onUseTemplate: (templateKey: string) => void;
};

export function TemplateCard({
  template,
  selected,
  onSelect,
  onUseTemplate,
}: TemplateCardProps) {
  const type = getTemplateType(template);

  return (
    <article
      className={`rounded-[1.25rem] border p-4 transition ${
        selected
          ? "border-violet-300/55 bg-violet-300/[0.06]"
          : "border-white/10 bg-white/[0.035] hover:border-white/24"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(template.key)}
        className="block w-full cursor-pointer text-left"
      >
        <TemplateHomepageThumbnail template={template} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
            {type}
          </span>
          <TemplateVersionBadge status={getTemplateStatus(template)} />
        </div>
        <h3 className="mt-3 truncate text-lg font-semibold text-white">{template.name}</h3>
        <p className="mt-1 text-xs text-white/45">
          {formatTemplateCategory(template.category)} / {getTemplateVersion(template)}
        </p>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-relaxed text-white/58">
          {template.description}
        </p>
        <div className="mt-4">
          <TemplateModuleChips modules={getTemplateModules(template)} limit={4} />
        </div>
      </button>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <p className="text-xs text-white/48">Used by {template.usageCount ?? 0} sites</p>
        <button
          type="button"
          onClick={() => onUseTemplate(template.key)}
          className="cursor-pointer rounded-full border border-white/12 px-3 py-2 text-xs text-white/72 transition hover:border-white/35 hover:text-white"
        >
          Use template
        </button>
      </div>
    </article>
  );
}
