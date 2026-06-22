import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AssetDeleteButton } from "@/components/assets/asset-delete-button";
import { AssetForm } from "@/components/assets/asset-form";
import { AuthFeedback } from "@/components/auth/auth-feedback";
import { formatDateLabel } from "@/components/clients/date-label";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAssetTags, getAssetTypeLabel } from "@/lib/assets/types";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchAssetById } from "@/lib/db/assets";
import { fetchCampaignsForAgency } from "@/lib/db/campaigns";
import { fetchClientsForAgency } from "@/lib/db/clients";

type AssetDetailPageProps = {
  params: Promise<{ assetId: string }>;
  searchParams: Promise<{ notice?: string; returnTo?: string }>;
};

function getNoticeMessage(code: string | undefined) {
  switch (code) {
    case "asset_uploaded":
      return "Asset uploaded successfully.";
    case "asset_updated":
      return "Asset metadata updated.";
    default:
      return null;
  }
}

function getSafeReturnPath(value: string | undefined) {
  if (!value?.startsWith("/")) {
    return "/assets";
  }

  return value;
}

export default async function AssetDetailPage({
  params,
  searchParams,
}: AssetDetailPageProps) {
  const [{ assetId }, { notice, returnTo }, membership] = await Promise.all([
    params,
    searchParams,
    fetchCurrentAgencyMembership(),
  ]);

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Asset Detail"
          title="No agency membership found"
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <Button asChild variant="outline">
          <Link href="/assets">Return to assets</Link>
        </Button>
      </div>
    );
  }

  const [asset, clients, campaigns] = await Promise.all([
    fetchAssetById(membership.agency_id, assetId),
    fetchClientsForAgency({
      agencyId: membership.agency_id,
      status: "all",
    }),
    fetchCampaignsForAgency({
      agencyId: membership.agency_id,
      status: "all",
    }),
  ]);

  if (!asset) {
    notFound();
  }

  const safeReturnTo = getSafeReturnPath(returnTo);
  const openHref = asset.download_url ?? asset.file_url;
  const tags = formatAssetTags(asset.tags);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <PageHeader
            eyebrow="Asset Detail"
            title={asset.name}
            description="Review the saved file context, then refine client and campaign metadata without replacing the binary in this MVP."
          />
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">{getAssetTypeLabel(asset.type)}</Badge>
            <p className="text-sm text-muted-foreground">
              Uploaded {formatDateLabel(asset.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href={safeReturnTo as Route}>Back to assets</Link>
          </Button>
          {openHref ? (
            <Button asChild>
              <a href={openHref} rel="noreferrer" target="_blank">
                Open file
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <AuthFeedback message={getNoticeMessage(notice)} tone="success" />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="p-0">
            <CardTitle className="text-2xl">File overview</CardTitle>
            <CardDescription>
              The stored file preview and the linked client or campaign context.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-0">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
              <div
                className="flex min-h-[320px] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(69,205,196,0.16),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] bg-cover bg-center p-6"
                style={
                  asset.is_image && openHref
                    ? { backgroundImage: `url("${openHref}")` }
                    : undefined
                }
              >
                {!asset.is_image ? (
                  <div className="max-w-sm text-center">
                    <p className="text-lg font-semibold text-foreground">
                      {getAssetTypeLabel(asset.type)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      This file type does not render inline here. Use the open file action to inspect the original asset.
                    </p>
                  </div>
                ) : (
                  <div className="self-end rounded-full border border-black/20 bg-black/50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
                    Image preview
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Client
                </p>
                <p className="text-sm text-foreground">{asset.client?.name ?? "Unknown client"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Campaign
                </p>
                <p className="text-sm text-foreground">
                  {asset.campaign?.title ?? "General client asset"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  MIME type
                </p>
                <p className="text-sm text-foreground">{asset.type}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Storage path
                </p>
                <p className="break-all text-sm text-foreground">{asset.storage_path ?? "Not available"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Tags
              </p>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tags were saved for this asset yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Notes
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {asset.notes ?? "No notes were saved for this asset yet."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm leading-6 text-muted-foreground">
                  Delete removes the asset record and attempts to remove the stored file from Supabase Storage.
                </p>
                <AssetDeleteButton assetId={asset.id} returnTo={safeReturnTo} />
              </div>
            </div>
          </CardContent>
        </Card>

        <AssetForm
          asset={asset}
          campaigns={campaigns}
          clients={clients}
          description="Update the linked client, optional campaign, tags, and notes. File replacement stays out of scope for this MVP."
          returnTo={safeReturnTo}
          title="Metadata"
        />
      </div>
    </div>
  );
}
