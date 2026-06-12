type SitesHeaderProps = {
  tenantName: string | null | undefined;
  currentSiteName: string | null | undefined;
  role: string | null | undefined;
  onCreateSite: () => void;
};

export function SitesHeader({
  onCreateSite,
}: SitesHeaderProps) {
  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-emerald-300/75">
          Sites
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white">
          Sites
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/58">
          Manage tenant sites, compare readiness, and switch working context.
        </p>
      </div>

      <button
        type="button"
        onClick={onCreateSite}
        className="inline-flex cursor-pointer items-center justify-center self-start rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
      >
        Create site
      </button>
    </section>
  );
}
