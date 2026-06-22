export default function CampaignDetailLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="h-12 w-1/2 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-5 w-full animate-pulse rounded-2xl bg-white/10" />
      </div>
      <div className="h-14 w-full animate-pulse rounded-2xl bg-white/10" />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-96 animate-pulse rounded-2xl bg-white/10" />
      </div>
    </div>
  );
}
