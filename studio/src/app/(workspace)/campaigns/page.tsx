import type { Route } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { formatDateLabel } from "@/components/clients/date-label";
import { RouteEmptyState } from "@/components/clients/route-empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchCampaignsForAgency } from "@/lib/db/campaigns";
import { fetchClientsForAgency } from "@/lib/db/clients";

type CampaignsPageProps = {
  searchParams: Promise<{
    clientId?: string;
    query?: string;
    status?:
      | "all"
      | "approved"
      | "completed"
      | "content_generated"
      | "draft"
      | "in_review"
      | "planning";
  }>;
};

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Planning", value: "planning" },
  { label: "Content Generated", value: "content_generated" },
  { label: "In Review", value: "in_review" },
  { label: "Approved", value: "approved" },
  { label: "Completed", value: "completed" },
] as const;

function formatList(values: unknown) {
  return Array.isArray(values)
    ? values.filter((item): item is string => typeof item === "string").join(", ")
    : "";
}

export default async function CampaignsPage({
  searchParams,
}: CampaignsPageProps) {
  const [{ clientId = "", query = "", status = "all" }, membership] =
    await Promise.all([searchParams, fetchCurrentAgencyMembership()]);

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Campaign Planning"
          title="No active agency membership found"
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <RouteEmptyState
          description="Campaign records stay hidden until the signed-in user belongs to the active agency. Once access exists, create a campaign brief to generate strategy and content."
          eyebrow="Membership required"
          href="/dashboard"
          primaryLabel="Return to dashboard"
          title="No campaign data is accessible yet"
        />
      </div>
    );
  }

  const [clients, campaigns] = await Promise.all([
    fetchClientsForAgency({
      agencyId: membership.agency_id,
      status: "all",
    }),
    fetchCampaignsForAgency({
      agencyId: membership.agency_id,
      clientId: clientId || undefined,
      query,
      status,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Campaign Planning"
          title="Structure the brief before content gets generated."
          description="Campaigns connect the client profile, target audience, offer, platforms, timing, and content types into one working brief."
        />
        <Button asChild className="min-w-[180px] self-start lg:self-auto">
          <Link href={"/campaigns/new" as Route}>Create Campaign</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="text-xl">Filters</CardTitle>
          <CardDescription>
            Search by title, objective, or theme, then narrow by campaign status or client.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form className="grid gap-4 xl:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                defaultValue={query}
                name="query"
                placeholder="Search campaigns by title, objective, or theme"
              />
            </div>
            <select
              className="flex h-11 min-w-[180px] rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
              defaultValue={status}
              name="status"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="flex h-11 min-w-[200px] rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
              defaultValue={clientId}
              name="clientId"
            >
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
          </form>
        </CardContent>
      </Card>

      {campaigns.length === 0 ? (
        <RouteEmptyState
          description="No campaigns match the current filters. Clear the search, switch status, change client, or create a campaign brief to generate strategy and content."
          eyebrow="No campaigns found"
          href={"/campaigns/new" as Route}
          primaryLabel="Create a campaign brief"
          title="The campaign list is empty for this view"
        />
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="gap-4">
              <CardHeader className="flex flex-col gap-4 p-0 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-2xl">{campaign.title}</CardTitle>
                    <CampaignStatusBadge status={campaign.status} />
                  </div>
                  <CardDescription className="leading-6">
                    {campaign.client?.name ?? "Unknown client"}{" "}
                    {campaign.objective ? `• ${campaign.objective}` : ""}
                  </CardDescription>
                </div>
                  <Button asChild variant="outline">
                    <Link href={`/campaigns/${campaign.id}` as Route}>Open campaign</Link>
                  </Button>
              </CardHeader>
              <CardContent className="grid gap-4 p-0 md:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Theme
                  </p>
                  <p className="text-sm text-foreground">
                    {campaign.campaign_theme ?? "Not set"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Platforms
                  </p>
                  <p className="text-sm text-foreground">
                    {formatList(campaign.platforms) || "Not set"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Content types
                  </p>
                  <p className="text-sm text-foreground">
                    {formatList(campaign.content_types) || "Not set"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Number of posts
                  </p>
                  <p className="text-sm text-foreground">{campaign.number_of_posts}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Created
                  </p>
                  <p className="text-sm text-foreground">
                    {formatDateLabel(campaign.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
