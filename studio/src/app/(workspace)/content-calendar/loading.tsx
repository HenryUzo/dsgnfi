import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContentCalendarLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-5 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="h-10 w-96 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-5 w-[40rem] animate-pulse rounded-full bg-white/10" />
      </div>
      <Card>
        <CardHeader className="p-0">
          <CardTitle className="text-xl">Loading content calendar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-0">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]"
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
