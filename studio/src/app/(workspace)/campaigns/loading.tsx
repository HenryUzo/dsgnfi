export default function CampaignsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-5 w-full animate-pulse rounded-2xl bg-white/10" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <div className="mb-4 h-8 w-1/3 animate-pulse rounded-2xl bg-white/10" />
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 6 }).map((__, innerIndex) => (
                <div
                  key={innerIndex}
                  className="h-24 animate-pulse rounded-2xl bg-white/10"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
