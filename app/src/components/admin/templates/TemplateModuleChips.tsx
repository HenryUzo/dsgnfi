type TemplateModuleChipsProps = {
  modules: string[];
  limit?: number;
};

export function TemplateModuleChips({ modules, limit = 6 }: TemplateModuleChipsProps) {
  const visible = modules.slice(0, limit);
  const hiddenCount = Math.max(modules.length - visible.length, 0);

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((module) => (
        <span
          key={module}
          className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs text-white/62"
        >
          {module}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs text-white/62">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}
