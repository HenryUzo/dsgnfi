export default function AssetDetailLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="h-12 w-1/2 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-5 w-full animate-pulse rounded-2xl bg-white/10" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="h-[520px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
        <div className="h-[520px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
      </div>
    </div>
  );
}
