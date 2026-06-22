import type { Route } from "next";
import Link from "next/link";
import { ExternalLink, FileImage, FileText, FolderOpen, Presentation, Tags } from "lucide-react";

import { AssetDeleteButton } from "@/components/assets/asset-delete-button";
import { formatDateLabel } from "@/components/clients/date-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAssetTags, getAssetTypeLabel } from "@/lib/assets/types";
import type { AssetWithRelations } from "@/lib/db/assets";

function getAssetIcon(type: string) {
  const label = getAssetTypeLabel(type);

  switch (label) {
    case "Image":
      return FileImage;
    case "PDF":
      return FileText;
    case "Presentation":
      return Presentation;
    default:
      return FolderOpen;
  }
}

type AssetCollectionProps = {
  assets: AssetWithRelations[];
  description?: string;
  emptyDescription: string;
  emptyTitle: string;
  returnTo?: string;
  title: string;
  uploadHref?: string;
  view?: "grid" | "list";
};

export function AssetCollection({
  assets,
  description,
  emptyDescription,
  emptyTitle,
  returnTo,
  title,
  uploadHref,
  view = "grid",
}: AssetCollectionProps) {
  if (assets.length === 0) {
    return (
      <Card>
        <CardHeader className="p-0">
          <CardTitle className="text-2xl">{title}</CardTitle>
          {description ? (
            <CardDescription className="leading-6">{description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6">
            <h3 className="text-xl font-semibold text-foreground">{emptyTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {emptyDescription}
            </p>
            {uploadHref ? (
              <div className="mt-4">
                <Button asChild>
                  <Link href={uploadHref as Route}>Upload asset</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className={view === "grid" ? "grid gap-4 xl:grid-cols-2" : "grid gap-4"}>
        {assets.map((asset) => {
          const tags = formatAssetTags(asset.tags);
          const AssetIcon = getAssetIcon(asset.type);
          const openHref = asset.download_url ?? asset.file_url;

          return (
            <Card key={asset.id} className="gap-4">
              <CardHeader className="flex flex-col gap-4 p-0 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-2xl">{asset.name}</CardTitle>
                    <Badge variant="outline">{getAssetTypeLabel(asset.type)}</Badge>
                  </div>
                  <CardDescription className="leading-6">
                    {asset.client?.name ?? "Unknown client"}
                    {asset.campaign ? ` / ${asset.campaign.title}` : " / General client asset"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline">
                    <Link href={`/assets/${asset.id}` as Route}>Edit metadata</Link>
                  </Button>
                  {openHref ? (
                    <Button asChild>
                      <a href={openHref} rel="noreferrer" target="_blank">
                        Open file
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className={view === "grid" ? "grid gap-4 p-0" : "grid gap-4 p-0 lg:grid-cols-[280px_1fr]"}>
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                  <div
                    className="flex min-h-[220px] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(69,205,196,0.16),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] bg-cover bg-center p-6"
                    style={
                      asset.is_image && openHref
                        ? { backgroundImage: `url("${openHref}")` }
                        : undefined
                    }
                  >
                    {!asset.is_image ? (
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <AssetIcon className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{getAssetTypeLabel(asset.type)}</p>
                          <p className="text-sm text-muted-foreground">
                            Preview is available after opening the file.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="self-end rounded-full border border-black/20 bg-black/50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
                        Image preview
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Uploaded
                      </p>
                      <p className="text-sm text-foreground">{formatDateLabel(asset.created_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        File type
                      </p>
                      <p className="text-sm text-foreground">{asset.type}</p>
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
                            <Tags className="h-3 w-3" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No tags added yet.</p>
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

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm leading-6 text-muted-foreground">
                      Delete removes both the asset record and the Supabase Storage file.
                    </p>
                    <AssetDeleteButton assetId={asset.id} returnTo={returnTo} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
