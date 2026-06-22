import type { Route } from "next";
import Link from "next/link";

import { RouteEmptyState } from "@/components/clients/route-empty-state";
import { ContentList } from "@/components/content/content-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchCampaignsForAgency } from "@/lib/db/campaigns";
import { fetchClientsForAgency } from "@/lib/db/clients";
import { fetchContentItems } from "@/lib/db/content-items";
import { campaignContentTypeOptions, campaignPlatformOptions } from "@/lib/campaigns/types";
import { contentItemStatusOptions } from "@/lib/content/types";

type ContentCalendarPageProps = {
  searchParams: Promise<{
    campaignId?: string;
    clientId?: string;
    contentType?: string;
    endDate?: string;
    platform?: string;
    query?: string;
    startDate?: string;
    status?: string;
  }>;
};

function buildExportHref(params: {
  campaignId: string;
  clientId: string;
  contentType: string;
  endDate: string;
  platform: string;
  query: string;
  startDate: string;
  status: string;
}) {
  const search = new URLSearchParams();

  if (params.campaignId) search.set("campaignId", params.campaignId);
  if (params.clientId) search.set("clientId", params.clientId);
  if (params.contentType) search.set("contentType", params.contentType);
  if (params.endDate) search.set("endDate", params.endDate);
  if (params.platform) search.set("platform", params.platform);
  if (params.query) search.set("query", params.query);
  if (params.startDate) search.set("startDate", params.startDate);
  if (params.status) search.set("status", params.status);

  return `/content-calendar/export?${search.toString()}` as Route;
}

export default async function ContentCalendarPage({
  searchParams,
}: ContentCalendarPageProps) {
  const membership = await fetchCurrentAgencyMembership();
  const {
    campaignId = "",
    clientId = "",
    contentType = "",
    endDate = "",
    platform = "",
    query = "",
    startDate = "",
    status = "all",
  } = await searchParams;

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Execution Queue"
          title="No agency membership found"
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <RouteEmptyState
          description="Content items remain hidden until the signed-in user belongs to the active agency. Once access exists, generate a campaign calendar to create content items."
          eyebrow="Membership required"
          href="/dashboard"
          primaryLabel="Return to dashboard"
          title="No calendar data is accessible yet"
        />
      </div>
    );
  }

  const [items, clients, campaigns] = await Promise.all([
    fetchContentItems({
      agencyId: membership.agency_id,
      campaignId: campaignId || undefined,
      clientId: clientId || undefined,
      contentType: contentType || undefined,
      endDate: endDate || undefined,
      platform: platform || undefined,
      search: query || undefined,
      startDate: startDate || undefined,
      status:
        status === "all" ||
        contentItemStatusOptions.some((option) => option.value === status)
          ? (status as (typeof contentItemStatusOptions)[number]["value"] | "all")
          : "all",
    }),
    fetchClientsForAgency({
      agencyId: membership.agency_id,
      status: "all",
    }),
    fetchCampaignsForAgency({
      agencyId: membership.agency_id,
      status: "all",
    }),
  ]);

  const exportHref = buildExportHref({
    campaignId,
    clientId,
    contentType,
    endDate,
    platform,
    query,
    startDate,
    status,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Execution Queue"
          title="Run editorial review from one operational content calendar."
          description="Filter generated items by client, campaign, platform, type, status, and timing, then open each item for drafting, comments, approvals, and export preparation."
        />
        <Button asChild className="min-w-[220px] self-start lg:self-auto" variant="outline">
          <Link href={exportHref}>Export filtered CSV</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="text-xl">Filters</CardTitle>
          <CardDescription>
            Narrow the content calendar by operational status, delivery channel, account, or date window.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form className="grid gap-4 xl:grid-cols-4">
            <Input defaultValue={query} name="query" placeholder="Search title, objective, hook, or CTA" />
            <select
              className="flex h-11 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
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
            <select
              className="flex h-11 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
              defaultValue={campaignId}
              name="campaignId"
            >
              <option value="">All campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </option>
              ))}
            </select>
            <select
              className="flex h-11 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
              defaultValue={platform}
              name="platform"
            >
              <option value="">All platforms</option>
              {campaignPlatformOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="flex h-11 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
              defaultValue={contentType}
              name="contentType"
            >
              <option value="">All content types</option>
              {campaignContentTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="flex h-11 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
              defaultValue={status}
              name="status"
            >
              <option value="all">All statuses</option>
              {contentItemStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input defaultValue={startDate} name="startDate" type="date" />
            <Input defaultValue={endDate} name="endDate" type="date" />
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <RouteEmptyState
          description="No content items match the current filters. Adjust the search, widen the date window, or generate a campaign calendar to create content items."
          eyebrow="No content found"
          href="/campaigns"
          primaryLabel="Generate a campaign calendar"
          title="The content calendar is empty for this view"
        />
      ) : (
        <ContentList
          description="Open any item to generate a full draft, edit final copy, manage comments, and move it through approval states."
          items={items}
          title="Filtered content items"
        />
      )}
    </div>
  );
}
