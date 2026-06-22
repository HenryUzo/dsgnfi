import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContentItemLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-5 w-36 animate-pulse rounded-full bg-white/10" />
        <div className="h-10 w-80 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-5 w-[30rem] animate-pulse rounded-full bg-white/10" />
      </div>
      <Card>
        <CardHeader className="p-0">
          <CardTitle className="text-2xl">Loading content item</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-0">
          <div className="h-48 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
          <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
        </CardContent>
      </Card>
    </div>
  );
}
