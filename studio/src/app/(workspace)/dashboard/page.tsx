import type { Route } from "next";
import Link from "next/link";
import {
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileStack,
  FolderOpen,
  Sparkles,
  Users2,
} from "lucide-react";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { RouteEmptyState } from "@/components/clients/route-empty-state";
import { ContentStatusBadge } from "@/components/content/content-status-badge";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { formatDateLabel } from "@/components/clients/date-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchDashboardSnapshot } from "@/lib/db/dashboard";
import { formatActivityActionLabel, formatStatusLabel } from "@/lib/status";

function EmptySection({
  ctaHref,
  ctaLabel,
  description,
  title,
}: {
  ctaHref: Route;
  ctaLabel: string;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-4">
        <Button asChild>
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const membership = await fetchCurrentAgencyMembership();

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Agency Operations"
          title="No active agency membership found"
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <RouteEmptyState
          description="The dashboard only loads real metrics after this authenticated user belongs to an agency. Seeded clients, campaigns, content, assets, and activity stay hidden until that membership exists."
          eyebrow="Membership required"
          href={"/clients" as Route}
          primaryLabel="Open clients after access exists"
          title="This account is not connected to an agency yet"
        />
      </div>
    );
  }

  const snapshot = await fetchDashboardSnapshot(membership.agency_id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Agency Operations"
          title="Run campaign planning, content review, and asset control from one dashboard."
          description="This workspace surfaces the current agency load across clients, campaigns, AI output, reviews, and storage-backed references."
        />
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={"/clients/new" as Route}>Create Client</Link>
          </Button>
          <Button asChild>
            <Link href={"/campaigns/new" as Route}>Create Campaign</Link>
          </Button>
        </div>
      </div>

      <AuthFeedback
        message={!snapshot.metrics.totalClients ? "Create your first client workspace to unlock campaign planning, content generation, and dashboard trends." : null}
        tone="success"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          delta={`${snapshot.metrics.activeClients} active`}
          description="Total client workspaces accessible in the current agency."
          icon={Users2}
          label="Total Clients"
          value={String(snapshot.metrics.totalClients)}
        />
        <MetricCard
          delta={`${snapshot.metrics.totalCampaigns} total`}
          description="Campaigns still in motion across planning, review, or approval."
          icon={BriefcaseBusiness}
          label="Active Campaigns"
          tone={snapshot.metrics.activeCampaigns > 0 ? "warning" : "default"}
          value={String(snapshot.metrics.activeCampaigns)}
        />
        <MetricCard
          delta={`${snapshot.metrics.contentNeedingReview} waiting`}
          description="Generated or drafted content items currently stored in the workspace."
          icon={Sparkles}
          label="Content Generated"
          tone={snapshot.metrics.contentGenerated > 0 ? "default" : "warning"}
          value={String(snapshot.metrics.contentGenerated)}
        />
        <MetricCard
          delta={`${snapshot.metrics.approvedContent} approved`}
          description="Items still needing human attention before they can move forward."
          icon={Clock3}
          label="Content Needing Review"
          tone={snapshot.metrics.contentNeedingReview > 0 ? "warning" : "success"}
          value={String(snapshot.metrics.contentNeedingReview)}
        />
        <MetricCard
          delta={`${snapshot.recentAssets.length} recent`}
          description="Files stored in the private asset bucket and linked into the agency workspace."
          icon={FolderOpen}
          label="Total Assets"
          value={String(snapshot.metrics.totalAssets)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          delta={`${snapshot.metrics.totalClients - snapshot.metrics.activeClients} inactive`}
          description="Clients currently marked active and available for ongoing work."
          icon={Users2}
          label="Active Clients"
          tone={snapshot.metrics.activeClients > 0 ? "success" : "default"}
          value={String(snapshot.metrics.activeClients)}
        />
        <MetricCard
          delta={`${snapshot.metrics.totalCampaigns - snapshot.metrics.activeCampaigns} completed`}
          description="All campaigns in the agency, including completed or archived planning records."
          icon={BriefcaseBusiness}
          label="Total Campaigns"
          value={String(snapshot.metrics.totalCampaigns)}
        />
        <MetricCard
          delta={`${snapshot.metrics.readyToPublishContent} ready`}
          description="Content items that have cleared review and are approved for manual publishing prep."
          icon={CheckCircle2}
          label="Approved Content"
          tone={snapshot.metrics.approvedContent > 0 ? "success" : "default"}
          value={String(snapshot.metrics.approvedContent)}
        />
        <MetricCard
          delta="Manual publish"
          description="Content items that are approved and queued for manual distribution."
          icon={FileStack}
          label="Ready to Publish"
          tone={snapshot.metrics.readyToPublishContent > 0 ? "success" : "default"}
          value={String(snapshot.metrics.readyToPublishContent)}
        />
        <MetricCard
          delta={`${snapshot.recentActivity.length} recent`}
          description="Recent activity captured from content, campaigns, assets, and exports."
          icon={Boxes}
          label="Recent Activity"
          value={String(snapshot.recentActivity.length)}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-col gap-4 p-0 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Badge variant="outline">Recent Campaigns</Badge>
              <CardTitle className="text-2xl">Fresh brief activity</CardTitle>
              <CardDescription>
                The latest campaign records created or updated inside this agency.
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href={"/campaigns" as Route}>Open campaigns</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 p-0">
            {snapshot.recentCampaigns.length === 0 ? (
              <EmptySection
                ctaHref={"/campaigns/new" as Route}
                ctaLabel="Create a campaign brief"
                description="No campaigns exist yet. Create a campaign brief to generate strategy and content."
                title="No campaigns yet"
              />
            ) : (
              snapshot.recentCampaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-foreground">{campaign.title}</h3>
                        <CampaignStatusBadge status={campaign.status} />
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {campaign.client?.name ?? "Unknown client"} / Created {formatDateLabel(campaign.created_at)}
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/campaigns/${campaign.id}` as Route}>Open</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-0">
            <Badge variant="outline">Recent Activity</Badge>
            <CardTitle className="text-2xl">Latest recorded actions</CardTitle>
            <CardDescription>
              Activity logs help verify what changed before the team moves to the next step.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-0">
            {snapshot.recentActivity.length === 0 ? (
              <EmptySection
                ctaHref={"/clients/new" as Route}
                ctaLabel="Create your first client workspace"
                description="No activity has been recorded yet. Create clients, campaigns, or uploads to start the audit trail."
                title="No recent activity"
              />
            ) : (
              snapshot.recentActivity.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{formatActivityActionLabel(entry.action)}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {formatDateLabel(entry.created_at)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {entry.user_email ?? "Team member"} / {entry.entity_type.replace(/_/g, " ")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="p-0">
            <Badge variant="outline">Upcoming Content</Badge>
            <CardTitle className="text-2xl">What is scheduled next</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-0">
            {snapshot.upcomingContent.length === 0 ? (
              <EmptySection
                ctaHref={"/campaigns" as Route}
                ctaLabel="Generate a campaign calendar"
                description="No future content is scheduled yet. Generate a campaign calendar to create content items."
                title="No upcoming content"
              />
            ) : (
              snapshot.upcomingContent.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <ContentStatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.client?.name ?? "Unknown client"} / {item.campaign?.title ?? "No campaign"} / {item.suggested_date ? formatDateLabel(item.suggested_date) : "Date TBD"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-0">
            <Badge variant="warning">Pending Reviews</Badge>
            <CardTitle className="text-2xl">Human review queue</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-0">
            {snapshot.pendingReviews.length === 0 ? (
              <EmptySection
                ctaHref={"/content-calendar" as Route}
                ctaLabel="Open content calendar"
                description="No content is waiting on review right now. Generate new drafts or move items into review when ready."
                title="Review queue is clear"
              />
            ) : (
              snapshot.pendingReviews.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <ContentStatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.client?.name ?? "Unknown client"} / {item.platform} / {item.content_type}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-0">
            <Badge variant="outline">Recently Uploaded Assets</Badge>
            <CardTitle className="text-2xl">Latest stored references</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-0">
            {snapshot.recentAssets.length === 0 ? (
              <EmptySection
                ctaHref={"/assets/new" as Route}
                ctaLabel="Upload logos, photos, and brand references"
                description="No assets exist yet. Upload logos, photos, and brand references."
                title="No assets uploaded"
              />
            ) : (
              snapshot.recentAssets.map((asset) => (
                <div key={asset.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{asset.name}</p>
                    <Badge variant="outline">{asset.type}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {asset.client?.name ?? "Unknown client"} / {asset.campaign?.title ?? "General client asset"} / Uploaded {formatDateLabel(asset.created_at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader className="p-0">
            <Badge variant="outline">Recent AI Generations</Badge>
            <CardTitle className="text-2xl">Latest model activity</CardTitle>
            <CardDescription>
              Track successful and failed generation attempts without exposing any server-only secrets.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-0">
            {snapshot.recentAIGenerations.length === 0 ? (
              <EmptySection
                ctaHref={"/campaigns" as Route}
                ctaLabel="Create a campaign brief to generate strategy and content"
                description="No AI generation records exist yet. Create a campaign brief to generate strategy and content."
                title="No AI generation history"
              />
            ) : (
              snapshot.recentAIGenerations.map((generation) => (
                <div key={generation.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={generation.status === "success" ? "success" : "warning"}>
                      {formatStatusLabel(generation.status)}
                    </Badge>
                    <p className="font-medium text-foreground">
                      {formatStatusLabel(generation.generation_type)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {generation.client_name ?? "Unknown client"} / {generation.campaign_title ?? "No campaign"} / {formatDateLabel(generation.created_at)}
                  </p>
                  {generation.status === "failed" && generation.error_message ? (
                    <p className="mt-2 text-sm leading-6 text-rose-100">{generation.error_message}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
