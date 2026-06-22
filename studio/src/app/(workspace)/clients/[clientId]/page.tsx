import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { AssetCollection } from "@/components/assets/asset-collection";
import { BrandProfileForm } from "@/components/clients/brand-profile-form";
import { CampaignClientList } from "@/components/campaigns/campaign-client-list";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { ClientTabs } from "@/components/clients/client-tabs";
import { ContentList } from "@/components/content/content-list";
import { RouteEmptyState } from "@/components/clients/route-empty-state";
import { formatDateLabel } from "@/components/clients/date-label";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchAssetsForClient } from "@/lib/db/assets";
import { fetchCampaignsForAgency } from "@/lib/db/campaigns";
import { fetchContentItems } from "@/lib/db/content-items";
import {
  fetchClientOverviewStats,
  fetchClientWithBrandProfile,
} from "@/lib/db/clients";

type ClientDetailPageProps = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ notice?: string; tab?: string }>;
};

function getNoticeMessage(code: string | undefined) {
  switch (code) {
    case "client_created":
      return "Client created successfully.";
    case "client_updated":
      return "Client updated successfully.";
    default:
      return null;
  }
}

function renderPlaceholderTab(clientId: string, tab: string) {
  const titles: Record<string, { eyebrow: string; title: string; description: string }> = {
    activity: {
      description:
        "Activity history is schema-ready, but this tab is intentionally light until more modules are wired into it.",
      eyebrow: "Activity",
      title: "Activity is reserved for later in the MVP",
    },
    content: {
      description:
        "Generated content items for this client will appear here once calendar generation runs or new items are added.",
      eyebrow: "Content",
      title: "No content items exist for this client yet",
    },
  };

  const config = titles[tab] ?? titles.content;

  return (
    <RouteEmptyState
      description={config.description}
      eyebrow={config.eyebrow}
      href={`/clients/${clientId}` as Route}
      primaryLabel="Return to overview"
      secondaryLabel="Open brand profile"
      title={config.title}
    />
  );
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps) {
  const [{ clientId }, { notice, tab = "overview" }, membership] = await Promise.all([
    params,
    searchParams,
    fetchCurrentAgencyMembership(),
  ]);

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Client Detail"
          title="No agency membership found"
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <Button asChild variant="outline">
          <Link href="/clients">Return to clients</Link>
        </Button>
      </div>
    );
  }

  const [detail, stats] = await Promise.all([
    fetchClientWithBrandProfile(membership.agency_id, clientId),
    fetchClientOverviewStats(membership.agency_id, clientId),
  ]);

  if (!detail) {
    notFound();
  }

  const { brand_profile: brandProfile, client } = detail;
  const campaigns =
    tab === "campaigns"
      ? await fetchCampaignsForAgency({
          agencyId: membership.agency_id,
          clientId: client.id,
          status: "all",
        })
      : [];
  const contentItems =
    tab === "content"
      ? await fetchContentItems({
          agencyId: membership.agency_id,
          clientId: client.id,
          status: "all",
        })
      : [];
  const assets =
    tab === "assets"
      ? await fetchAssetsForClient(membership.agency_id, client.id)
      : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <PageHeader
            eyebrow="Client Detail"
            title={client.name}
            description="Manage the account overview and the brand memory layer the team will rely on for future campaign work."
          />
          <div className="flex flex-wrap items-center gap-3">
            <ClientStatusBadge status={client.status} />
            <p className="text-sm text-muted-foreground">
              Created {formatDateLabel(client.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/clients">Back to clients</Link>
          </Button>
          <Button asChild>
            <Link href={`/clients/${client.id}/edit`}>Edit client</Link>
          </Button>
        </div>
      </div>

      <AuthFeedback message={getNoticeMessage(notice)} tone="success" />
      <ClientTabs clientId={client.id} currentTab={tab} />

      {tab === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="p-0">
              <CardTitle className="text-2xl">Overview</CardTitle>
              <CardDescription>
                Core client details the team needs before campaigns and content work begin.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-0 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Industry
                </p>
                <p className="text-sm text-foreground">
                  {client.industry ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Location
                </p>
                <p className="text-sm text-foreground">
                  {client.location ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Website
                </p>
                {client.website ? (
                  <a
                    className="text-sm text-primary hover:underline"
                    href={client.website}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {client.website}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided</p>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Contact person
                </p>
                <p className="text-sm text-foreground">
                  {client.contact_name ?? "Not provided"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {client.contact_email ?? "No email"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Description
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {client.description ?? "No description has been added yet."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-0">
              <CardTitle className="text-2xl">Quick stats</CardTitle>
              <CardDescription>
                Live counts from the existing MVP schema.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-0">
              {[
                { label: "Campaigns", value: stats.campaignCount },
                { label: "Content items", value: stats.contentItemCount },
                { label: "Assets", value: stats.assetCount },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "brand-profile" ? (
        <BrandProfileForm clientId={client.id} profile={brandProfile} />
      ) : null}

      {tab === "campaigns" ? (
        <CampaignClientList campaigns={campaigns} clientId={client.id} />
      ) : null}

      {tab === "content" ? (
        contentItems.length > 0 ? (
          <ContentList
            description="Open any content item to generate a full draft, edit versions, add review comments, and manage approval status."
            items={contentItems}
            title="Client content items"
          />
        ) : (
          renderPlaceholderTab(client.id, tab)
        )
      ) : null}

      {tab === "assets" ? (
        <AssetCollection
          assets={assets}
          description="Upload brand references, PDFs, decks, and source files linked to this client. Campaign-level assets stay visible here as part of the broader account memory."
          emptyDescription="This client does not have any uploaded assets yet. Start with logos, offer sheets, reference decks, or approved source files."
          emptyTitle="No client assets exist yet"
          returnTo={`/clients/${client.id}?tab=assets`}
          title="Client assets"
          uploadHref={`/assets/new?clientId=${client.id}&returnTo=${encodeURIComponent(`/clients/${client.id}?tab=assets`)}`}
        />
      ) : null}

      {tab === "activity" ? (
        renderPlaceholderTab(client.id, tab)
      ) : null}
    </div>
  );
}
