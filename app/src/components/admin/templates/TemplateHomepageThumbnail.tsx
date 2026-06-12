import type { TemplateSummary } from "../../../services/adminSites";

type TemplateHomepageThumbnailProps = {
  template: TemplateSummary;
};

export function TemplateHomepageThumbnail({ template }: TemplateHomepageThumbnailProps) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-black">
      <iframe
        title={`${template.name} homepage screenshot`}
        src={`/template-previews/${encodeURIComponent(template.key)}`}
        className="pointer-events-none absolute left-0 top-0 h-[360%] w-[360%] origin-top-left scale-[0.278] border-0"
        tabIndex={-1}
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
    </div>
  );
}
