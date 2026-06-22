import type { Route } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { AssetCollection } from "@/components/assets/asset-collection";
import { AuthFeedback } from "@/components/auth/auth-feedback";
import { RouteEmptyState } from "@/components/clients/route-empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchAssets } from "@/lib/db/assets";
import { fetchCampaignsForAgency } from "@/lib/db/campaigns";
import { fetchClientsForAgency } from "@/lib/db/clients";
import type { AssetTypeFilter } from "@/lib/assets/types";

type AssetsPageProps = {
  searchParams: Promise<{
    campaignId?: string;
    clientId?: string;
    notice?: string;
    query?: string;
    type?: AssetTypeFilter;
    view?: "grid" | "list";
  }>;
};

const typeOptions = [
  { label: "All types", value: "all" },
  { label: "Images", value: "image" },
  { label: "PDFs", value: "pdf" },
  { label: "Documents", value: "document" },
  { label: "Presentations", value: "presentation" },
] as const;

function getNoticeMessage(code: string | undefined) {
  switch (code) {
    case "asset_deleted":
      return "Asset deleted successfully.";
    case "asset_uploaded":
      return "Asset uploaded successfully.";
    case "asset_updated":
      return "Asset metadata updated.";
    default:
      return null;
  }
}

function buildRoute(basePath: string, values: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return query ? `${basePath}?${query}` : basePath;
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  const [
    {
      campaignId = "",
      clientId = "",
      notice,
      query = "",
      type = "all",
      view = "grid",
    },
    membership,
  ] = await Promise.all([searchParams, fetchCurrentAgencyMembership()]);

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Asset Library"
          title="No active agency membership found"
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <RouteEmptyState
          description="Storage-backed asset records remain hidden until the signed-in user belongs to the active agency. Once access exists, upload logos, photos, and brand references."
          eyebrow="Membership required"
          href={"/dashboard" as Route}
          primaryLabel="Return to dashboard"
          title="No asset data is accessible yet"
        />
      </div>
    );
  }

  const [clients, campaigns, assets] = await Promise.all([
    fetchClientsForAgency({
      agencyId: membership.agency_id,
      status: "all",
    }),
    fetchCampaignsForAgency({
      agencyId: membership.agency_id,
      clientId: clientId || undefined,
      status: "all",
    }),
    fetchAssets({
      agencyId: membership.agency_id,
      campaignId: campaignId || undefined,
      clientId: clientId || undefined,
      query,
      type,
    }),
  ]);

  const currentPath = buildRoute("/assets", {
    campaignId: campaignId || undefined,
    clientId: clientId || undefined,
    query: query || undefined,
    type: type !== "all" ? type : undefined,
    view: view !== "grid" ? view : undefined,
  });
  const uploadHref = buildRoute("/assets/new", {
    campaignId: campaignId || undefined,
    clientId: clientId || undefined,
    returnTo: currentPath,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Asset Library"
          title="Keep campaign source files and brand references in one scoped workspace."
          description="Upload once, link assets to the right client or campaign, and keep the working team inside the same agency-safe shell."
        />
        <Button asChild className="min-w-[180px] self-start lg:self-auto">
          <Link href={uploadHref as Route}>Upload Asset</Link>
        </Button>
      </div>

      <AuthFeedback message={getNoticeMessage(notice)} tone="success" />

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="text-xl">Filters</CardTitle>
          <CardDescription>
            Search by asset name or notes, then narrow by client, campaign, type, or view.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form className="grid gap-4 xl:grid-cols-[1fr_repeat(4,auto)]">
            <input name="view" type="hidden" value={view} />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                defaultValue={query}
                name="query"
                placeholder="Search assets by name or notes"
              />
            </div>
            <select
              className="flex h-11 min-w-[180px] rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
              defaultValue={type}
              name="type"
            >
              {typeOptions.map((option) => (
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
            <select
              className="flex h-11 min-w-[220px] rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
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
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant={view === "grid" ? "default" : "outline"}>
              <Link
                href={
                  buildRoute("/assets", {
                    campaignId: campaignId || undefined,
                    clientId: clientId || undefined,
                    query: query || undefined,
                    type: type !== "all" ? type : undefined,
                    view: "grid",
                  }) as Route
                }
              >
                Grid view
              </Link>
            </Button>
            <Button asChild variant={view === "list" ? "default" : "outline"}>
              <Link
                href={
                  buildRoute("/assets", {
                    campaignId: campaignId || undefined,
                    clientId: clientId || undefined,
                    query: query || undefined,
                    type: type !== "all" ? type : undefined,
                    view: "list",
                  }) as Route
                }
              >
                List view
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AssetCollection
        assets={assets}
        description="Use the asset detail view to refine metadata, open the original file, or remove outdated references cleanly."
        emptyDescription="No assets match the current filters yet. Adjust the search, clear a filter, or upload a new reference file."
        emptyTitle="No assets are stored for this view"
        returnTo={currentPath}
        title="Agency assets"
        uploadHref={uploadHref}
        view={view}
      />
    </div>
  );
}
