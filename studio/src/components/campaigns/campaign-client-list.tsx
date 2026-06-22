import type { Route } from "next";
import Link from "next/link";

import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { formatDateLabel } from "@/components/clients/date-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignWithClient } from "@/lib/db/campaigns";

function formatList(values: unknown) {
  return Array.isArray(values)
    ? values.filter((item): item is string => typeof item === "string").join(", ")
    : "";
}

export function CampaignClientList({
  campaigns,
  clientId,
}: {
  campaigns: CampaignWithClient[];
  clientId: string;
}) {
  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader className="p-0">
          <CardTitle className="text-2xl">Client campaigns</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5">
            <p className="mb-3 text-sm leading-6 text-muted-foreground">
              No campaigns exist for this client yet.
            </p>
            <Button asChild>
              <Link href={`/campaigns/new?clientId=${clientId}` as Route}>Create campaign</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 p-0 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle className="text-2xl">Client campaigns</CardTitle>
        <Button asChild>
          <Link href={`/campaigns/new?clientId=${clientId}` as Route}>Create campaign</Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 p-0">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-foreground">
                    {campaign.title}
                  </h3>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {campaign.objective ?? "No campaign objective yet."}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/campaigns/${campaign.id}` as Route}>Open campaign</Link>
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Theme
                </p>
                <p className="text-sm text-foreground">
                  {campaign.campaign_theme ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Platforms
                </p>
                <p className="text-sm text-foreground">
                  {formatList(campaign.platforms) || "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Content types
                </p>
                <p className="text-sm text-foreground">
                  {formatList(campaign.content_types) || "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Timeline
                </p>
                <p className="text-sm text-foreground">
                  {campaign.start_date ? formatDateLabel(campaign.start_date) : "Start TBD"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {campaign.end_date ? formatDateLabel(campaign.end_date) : "End TBD"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
