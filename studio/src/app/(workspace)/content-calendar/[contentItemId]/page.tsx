import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentItemWorkspace } from "@/components/content/content-editor-form";
import { ContentItemTabs } from "@/components/content/content-item-tabs";
import { ContentStatusBadge } from "@/components/content/content-status-badge";
import { formatDateLabel } from "@/components/clients/date-label";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import {
  fetchAuthUserEmails,
  fetchContentCommentsWithUserEmails,
  fetchContentItemById,
  fetchContentVariantsForItem,
} from "@/lib/db/content-items";

type ContentItemDetailPageProps = {
  params: Promise<{ contentItemId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

function formatHashtags(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").join(", ")
    : "";
}

function getMetadataSummary(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const summary = (value as Record<string, unknown>).caption_or_script_summary;

  return typeof summary === "string" ? summary : null;
}

function getMetadataNotes(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const summary = (value as Record<string, unknown>).draft_notes;

  return typeof summary === "string" ? summary : null;
}

export default async function ContentItemDetailPage({
  params,
  searchParams,
}: ContentItemDetailPageProps) {
  const [{ contentItemId }, { tab = "editor" }, membership] = await Promise.all([
    params,
    searchParams,
    fetchCurrentAgencyMembership(),
  ]);

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Content Detail"
          title="No agency membership found"
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <Button asChild variant="outline">
          <Link href="/content-calendar">Return to content calendar</Link>
        </Button>
      </div>
    );
  }

  const [contentItem, variants, comments] = await Promise.all([
    fetchContentItemById(membership.agency_id, contentItemId),
    fetchContentVariantsForItem(membership.agency_id, contentItemId),
    fetchContentCommentsWithUserEmails(membership.agency_id, contentItemId),
  ]);

  if (!contentItem) {
    notFound();
  }

  const latestVariant = variants[0] ?? null;
  const metadataSummary = getMetadataSummary(contentItem.metadata);
  const metadataNotes = getMetadataNotes(contentItem.metadata);
  const creatorEmailMap = await fetchAuthUserEmails(
    variants
      .map((variant) => variant.created_by)
      .filter((value): value is string => typeof value === "string"),
  );
  const variantsWithCreatorEmail = variants.map((variant) => ({
    ...variant,
    creator_email: variant.created_by
      ? (creatorEmailMap.get(variant.created_by) ?? null)
      : null,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <PageHeader
            eyebrow="Content Detail"
            title={contentItem.title}
            description="Edit the final working copy, preserve version history, capture feedback, and move the item through manual review and publishing readiness."
          />
          <div className="flex flex-wrap items-center gap-3">
            <ContentStatusBadge status={contentItem.status} />
            <p className="text-sm text-muted-foreground">
              {contentItem.client?.name ?? "Unknown client"} / {contentItem.campaign?.title ?? "No campaign"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/content-calendar">Back to content calendar</Link>
          </Button>
          {contentItem.campaign_id ? (
            <Button asChild variant="outline">
              <Link href={`/campaigns/${contentItem.campaign_id}?tab=calendar` as Route}>
                Open campaign
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <ContentItemTabs contentItemId={contentItem.id} currentTab={tab} />

      <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader className="p-0">
            <CardTitle className="text-2xl">Item details</CardTitle>
            <CardDescription>
              Editorial context for the current content item.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-0 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Platform
              </p>
              <p className="text-sm text-foreground">{contentItem.platform}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Content type
              </p>
              <p className="text-sm text-foreground">{contentItem.content_type}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Suggested date
              </p>
              <p className="text-sm text-foreground">
                {contentItem.suggested_date ? formatDateLabel(contentItem.suggested_date) : "Date TBD"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                CTA
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {contentItem.cta ?? "Not set"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Objective
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {contentItem.objective ?? "Not set"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Hook
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {contentItem.hook ?? "Not set"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Hashtags
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {formatHashtags(contentItem.hashtags) || "Not set"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-0">
            <CardTitle className="text-2xl">Metadata summary</CardTitle>
            <CardDescription>
              Stored generation summary and editorial notes when available.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-0">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Caption or script summary
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {metadataSummary ?? "No metadata summary is stored yet."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Draft notes
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {metadataNotes ?? "No draft notes are stored yet."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Latest version
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {latestVariant ? `Version ${latestVariant.version_number}` : "No versions yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ContentItemWorkspace
        comments={comments}
        contentItem={contentItem}
        currentTab={tab}
        latestVariant={latestVariant}
        variants={variantsWithCreatorEmail}
      />
    </div>
  );
}
