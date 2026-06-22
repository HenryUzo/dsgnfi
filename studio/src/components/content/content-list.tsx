import type { Route } from "next";
import Link from "next/link";

import { formatDateLabel } from "@/components/clients/date-label";
import { ContentStatusBadge } from "@/components/content/content-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContentItemWithRelations } from "@/lib/db/content-items";

function getContentSummary(item: ContentItemWithRelations) {
  return item.objective ?? item.hook ?? item.cta ?? "No summary yet.";
}

export function ContentList({
  items,
  title,
  description,
}: {
  description?: string;
  items: ContentItemWithRelations[];
  title?: string;
}) {
  return (
    <div className="space-y-4">
      {title ? (
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id} className="gap-4">
            <CardHeader className="flex flex-col gap-4 p-0 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-2xl">{item.title}</CardTitle>
                  <ContentStatusBadge status={item.status} />
                </div>
                <CardDescription className="leading-6">
                  {item.client?.name ?? "Unknown client"} / {item.campaign?.title ?? "No campaign"} /{" "}
                  {item.platform} / {item.content_type}
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href={`/content-calendar/${item.id}` as Route}>Open item</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 p-0 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Suggested date
                </p>
                <p className="text-sm text-foreground">
                  {item.suggested_date ? formatDateLabel(item.suggested_date) : "Date TBD"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 xl:col-span-2">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Summary
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {getContentSummary(item)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Hook
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.hook ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  CTA
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.cta ?? "Not set"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
