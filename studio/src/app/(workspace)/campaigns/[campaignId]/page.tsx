import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { parseCampaignStrategyCalendarOutput } from "@/lib/ai/schemas";
import { CAMPAIGN_STRATEGY_GENERATION_TYPE } from "@/lib/ai/types";
import { fetchLatestAIGenerationForCampaign } from "@/lib/db/ai-generations";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchAssetsForCampaign } from "@/lib/db/assets";
import {
  fetchCampaignById,
  fetchCampaignOverviewStats,
} from "@/lib/db/campaigns";
import { fetchContentItems } from "@/lib/db/content-items";
import { AssetCollection } from "@/components/assets/asset-collection";
import { CampaignGenerateForm } from "@/components/campaigns/campaign-generate-form";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { AuthFeedback } from "@/components/auth/auth-feedback";
import { formatDateLabel } from "@/components/clients/date-label";
import { RouteEmptyState } from "@/components/clients/route-empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStatusLabel } from "@/lib/status";
import type { ContentItem, Json } from "@/types/database";

type CampaignDetailPageProps = {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ notice?: string; tab?: string }>;
};

const tabs = [
  { label: "Overview", value: "overview" },
  { label: "Strategy", value: "strategy" },
  { label: "Calendar", value: "calendar" },
  { label: "Content", value: "content" },
  { label: "Assets", value: "assets" },
  { label: "Activity", value: "activity" },
] as const;

function getNoticeMessage(code: string | undefined) {
  switch (code) {
    case "campaign_created":
      return "Campaign created successfully.";
    case "campaign_updated":
      return "Campaign updated successfully.";
    default:
      return null;
  }
}

function formatList(values: unknown) {
  return Array.isArray(values)
    ? values.filter((item): item is string => typeof item === "string").join(", ")
    : "";
}

function formatHashtags(value: Json) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function getCaptionSummary(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const summary = (metadata as Record<string, Json | undefined>).caption_or_script_summary;

  return typeof summary === "string" ? summary : null;
}

function renderPlaceholderTab(campaignId: string, tab: string) {
  const titles: Record<string, { eyebrow: string; title: string; description: string }> = {
    activity: {
      description:
        "Activity logs are recorded at the schema layer, but the richer timeline interface is intentionally deferred.",
      eyebrow: "Activity",
      title: "Activity is reserved for later in the MVP",
    },
    content: {
      description:
        "Content variants, reviews, and approvals are intentionally deferred beyond this generation foundation.",
      eyebrow: "Content",
      title: "Content execution will activate in a later step",
    },
    strategy: {
      description:
        "Generate strategy first so the workspace has a structured campaign summary, angle, pillars, and CTA guidance to display here.",
      eyebrow: "Strategy",
      title: "No campaign strategy has been generated yet",
    },
  };

  const config = titles[tab] ?? titles.strategy;

  return (
    <RouteEmptyState
      description={config.description}
      eyebrow={config.eyebrow}
      href={`/campaigns/${campaignId}` as Route}
      primaryLabel="Return to overview"
      title={config.title}
    />
  );
}

function CalendarItemsList({ items }: { items: ContentItem[] }) {
  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const hashtags = formatHashtags(item.hashtags);
        const captionSummary = getCaptionSummary(item.metadata);

        return (
          <Card key={item.id} className="gap-4">
            <CardHeader className="flex flex-col gap-4 p-0 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-2xl">{item.title}</CardTitle>
                  <Badge variant="outline">{formatStatusLabel(item.status)}</Badge>
                </div>
                <CardDescription className="leading-6">
                  {item.platform} / {item.content_type} /{" "}
                  {item.suggested_date ? formatDateLabel(item.suggested_date) : "Date TBD"}
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href={`/content-calendar/${item.id}` as Route}>Open item</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 p-0 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Objective
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.objective ?? "Not set"}
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
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Caption or script summary
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {captionSummary ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Hashtags
                </p>
                {hashtags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {hashtags.map((hashtag) => (
                      <Badge key={hashtag} variant="outline">
                        {hashtag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hashtags were stored.</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: CampaignDetailPageProps) {
  const [{ campaignId }, { notice, tab = "overview" }, membership] =
    await Promise.all([params, searchParams, fetchCurrentAgencyMembership()]);

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Campaign Detail"
          title="No agency membership found"
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <Button asChild variant="outline">
          <Link href="/campaigns">Return to campaigns</Link>
        </Button>
      </div>
    );
  }

  const [
    campaign,
    stats,
    latestGeneration,
    latestSuccessfulGeneration,
    calendarItems,
  ] = await Promise.all([
    fetchCampaignById(membership.agency_id, campaignId),
    fetchCampaignOverviewStats(membership.agency_id, campaignId),
    fetchLatestAIGenerationForCampaign({
      agencyId: membership.agency_id,
      campaignId,
    }),
    fetchLatestAIGenerationForCampaign({
      agencyId: membership.agency_id,
      campaignId,
      status: "success",
    }),
    fetchContentItems({
      agencyId: membership.agency_id,
      campaignId,
    }),
  ]);

  if (!campaign) {
    notFound();
  }

  const latestSuccessfulOutput = latestSuccessfulGeneration
    ? parseCampaignStrategyCalendarOutput(latestSuccessfulGeneration.ai_output)
    : null;

  const latestOutput = latestGeneration
    ? parseCampaignStrategyCalendarOutput(latestGeneration.ai_output)
    : null;
  const campaignAssets =
    tab === "assets"
      ? await fetchAssetsForCampaign(membership.agency_id, campaign.id)
      : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <PageHeader
            eyebrow="Campaign Detail"
            title={campaign.title}
            description="Review the campaign brief, generate strategy and calendar output, and keep draft content items grounded in the current client context."
          />
          <div className="flex flex-wrap items-center gap-3">
            <CampaignStatusBadge status={campaign.status} />
            <p className="text-sm text-muted-foreground">
              Created {formatDateLabel(campaign.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/campaigns">Back to campaigns</Link>
          </Button>
          <Button asChild>
            <Link href={`/campaigns/${campaign.id}/edit` as Route}>Edit campaign</Link>
          </Button>
        </div>
      </div>

      <AuthFeedback message={getNoticeMessage(notice)} tone="success" />

      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          {tabs.map((entry) => (
            <Link
              key={entry.value}
              className={
                tab === entry.value
                  ? "rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
                  : "rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground"
              }
              href={`/campaigns/${campaign.id}?tab=${entry.value}` as Route}
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader className="p-0">
              <CardTitle className="text-2xl">Overview</CardTitle>
              <CardDescription>
                The planning brief the team should align on before campaign production starts.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-0 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Client
                </p>
                <p className="text-sm text-foreground">
                  {campaign.client?.name ?? "Unknown client"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Status
                </p>
                <div className="pt-1">
                  <CampaignStatusBadge status={campaign.status} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Objective
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {campaign.objective ?? "No objective has been added yet."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Target audience
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {campaign.target_audience ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Offer
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {campaign.offer ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Campaign theme
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
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
                  Start date
                </p>
                <p className="text-sm text-foreground">
                  {campaign.start_date ? formatDateLabel(campaign.start_date) : "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  End date
                </p>
                <p className="text-sm text-foreground">
                  {campaign.end_date ? formatDateLabel(campaign.end_date) : "Not set"}
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
                  Tone
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {campaign.tone ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Key message
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {campaign.key_message ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  CTA
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {campaign.cta ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Internal notes
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {campaign.internal_notes ?? "No internal notes yet."}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader className="p-0">
                <CardTitle className="text-2xl">AI Strategy & Calendar</CardTitle>
                <CardDescription>
                  Generate structured strategy output and insert draft calendar items into the campaign.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 p-0">
                <CampaignGenerateForm
                  campaignId={campaign.id}
                  hasExistingContentItems={calendarItems.length > 0}
                />

                {latestGeneration ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <Badge variant="outline">
                        {latestGeneration.status === "success" ? "Last generation" : "Last attempt failed"}
                      </Badge>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {formatDateLabel(latestGeneration.created_at)}
                      </p>
                    </div>
                    {latestGeneration.status === "success" && latestOutput ? (
                      <div className="space-y-3">
                        <p className="text-sm leading-6 text-muted-foreground">
                          {latestOutput.campaign_summary}
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Strategy angle
                            </p>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {latestOutput.strategy_angle}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Calendar items saved
                            </p>
                            <p className="text-2xl font-semibold text-foreground">
                              {latestOutput.calendar_items.length}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              {latestGeneration.model_used ?? CAMPAIGN_STRATEGY_GENERATION_TYPE}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-rose-100">
                        {latestGeneration.error_message ??
                          "The latest generation attempt failed before a usable strategy could be saved."}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-muted-foreground">
                    No AI strategy or calendar has been generated for this campaign yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-0">
                <CardTitle className="text-2xl">Quick stats</CardTitle>
                <CardDescription>
                  Live counts from the current campaign workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-0">
                {[
                  { label: "Content items", value: stats.contentItemCount },
                  { label: "Approved posts", value: stats.approvedPosts },
                  { label: "Pending reviews", value: stats.pendingReviews },
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
        </div>
      ) : null}

      {tab === "strategy" ? (
        latestSuccessfulOutput ? (
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader className="p-0">
                <CardTitle className="text-2xl">Campaign summary</CardTitle>
                <CardDescription>
                  The latest saved strategy output generated on{" "}
                  {latestSuccessfulGeneration
                    ? formatDateLabel(latestSuccessfulGeneration.created_at)
                    : "this campaign"}.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-0">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm leading-7 text-muted-foreground">
                    {latestSuccessfulOutput.campaign_summary}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Strategy angle
                  </p>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {latestSuccessfulOutput.strategy_angle}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Creative direction
                  </p>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {latestSuccessfulOutput.creative_direction}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card>
                <CardHeader className="p-0">
                  <CardTitle className="text-2xl">Content pillars</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 p-0">
                  {latestSuccessfulOutput.content_pillars.map((pillar) => (
                    <Badge key={pillar} variant="outline">
                      {pillar}
                    </Badge>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-0">
                  <CardTitle className="text-2xl">Recommended CTAs</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 p-0">
                  {latestSuccessfulOutput.recommended_ctas.map((cta) => (
                    <div
                      key={cta}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-muted-foreground"
                    >
                      {cta}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          renderPlaceholderTab(campaign.id, "strategy")
        )
      ) : null}

      {tab === "calendar" ? (
        calendarItems.length > 0 ? (
          <div className="space-y-4">
            <PageHeader
              eyebrow="Campaign Calendar"
              title="Generated draft calendar items"
              description="These items were inserted into content_items for this campaign and remain editable in later workflow steps."
            />
            <CalendarItemsList items={calendarItems} />
          </div>
        ) : (
          <RouteEmptyState
            description="No content items have been generated for this campaign yet. Start from the overview tab to create the first draft batch."
            eyebrow="Calendar empty"
            href={`/campaigns/${campaign.id}` as Route}
            primaryLabel="Return to overview"
            title="No calendar items are stored yet"
          />
        )
      ) : null}

      {tab === "assets" ? (
        <AssetCollection
          assets={campaignAssets}
          description="Keep campaign-specific references, decks, export PDFs, and image source files attached to the active brief."
          emptyDescription="No files have been attached to this campaign yet. Upload source material or approved references to support execution."
          emptyTitle="No campaign assets exist yet"
          returnTo={`/campaigns/${campaign.id}?tab=assets`}
          title="Campaign assets"
          uploadHref={`/assets/new?clientId=${campaign.client_id}&campaignId=${campaign.id}&returnTo=${encodeURIComponent(`/campaigns/${campaign.id}?tab=assets`)}`}
        />
      ) : null}

      {["content", "activity"].includes(tab) ? renderPlaceholderTab(campaign.id, tab) : null}
    </div>
  );
}
