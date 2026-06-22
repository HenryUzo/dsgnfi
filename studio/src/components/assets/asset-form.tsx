"use client";

import type { Route } from "next";
import Link from "next/link";
import { LoaderCircle, Save, Upload } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { formatDateLabel } from "@/components/clients/date-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  uploadAssetAction,
  updateAssetMetadataAction,
} from "@/lib/assets/actions";
import {
  allowedAssetMimeTypes,
  formatAssetTags,
  getAssetTypeLabel,
  initialAssetFormState,
  type AssetFormState,
} from "@/lib/assets/types";
import type { AssetWithRelations } from "@/lib/db/assets";
import type { CampaignWithClient } from "@/lib/db/campaigns";
import type { Client } from "@/types/database";

function SubmitButton({
  mode,
}: {
  mode: "create" | "edit";
}) {
  const { pending } = useFormStatus();
  const icon =
    mode === "create" ? (
      pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Upload className="h-4 w-4" />
      )
    ) : pending ? (
      <LoaderCircle className="h-4 w-4 animate-spin" />
    ) : (
      <Save className="h-4 w-4" />
    );

  return (
    <Button disabled={pending} type="submit">
      {icon}
      {pending
        ? mode === "create"
          ? "Uploading asset"
          : "Saving metadata"
        : mode === "create"
          ? "Upload asset"
          : "Save metadata"}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-200">{message}</p>;
}

type AssetFormProps = {
  asset?: AssetWithRelations;
  campaigns: CampaignWithClient[];
  clients: Client[];
  description: string;
  preselectedCampaignId?: string;
  preselectedClientId?: string;
  returnTo?: string;
  title: string;
};

export function AssetForm({
  asset,
  campaigns,
  clients,
  description,
  preselectedCampaignId,
  preselectedClientId,
  returnTo,
  title,
}: AssetFormProps) {
  const router = useRouter();
  const mode = asset ? "edit" : "create";
  const action = asset ? updateAssetMetadataAction : uploadAssetAction;
  const [state, formAction] = useActionState<AssetFormState, FormData>(
    action,
    initialAssetFormState,
  );
  const [selectedClientId, setSelectedClientId] = useState(
    asset?.client_id ?? preselectedClientId ?? "",
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    asset?.campaign_id ?? preselectedCampaignId ?? "",
  );

  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      startTransition(() => {
        router.push(state.redirectTo as Route);
      });
    }
  }, [router, state.redirectTo, state.status]);

  const availableCampaigns = campaigns.filter(
    (campaign) => campaign.client_id === selectedClientId,
  );
  const defaultTags = state.values?.tags ?? formatAssetTags(asset?.tags).join(", ");
  const defaultNotes = state.values?.notes ?? asset?.notes ?? "";
  const defaultName = state.values?.name ?? asset?.name ?? "";
  const currentDownloadUrl = asset?.download_url ?? null;

  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form action={formAction} className="grid gap-6">
          {asset ? <input name="assetId" type="hidden" value={asset.id} /> : null}
          {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
          <AuthFeedback
            message={state.message}
            tone={state.status === "success" ? "success" : "error"}
          />

          {asset ? (
            <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-3">
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Current file
                </p>
                <p className="text-sm text-foreground">{asset.name}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  File type
                </p>
                <p className="text-sm text-foreground">{getAssetTypeLabel(asset.type)}</p>
              </div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Uploaded
                  </p>
                  <p className="text-sm text-foreground">{formatDateLabel(asset.created_at)}</p>
                </div>
                {currentDownloadUrl ? (
                  <Button asChild type="button" variant="outline">
                    <a href={currentDownloadUrl} rel="noreferrer" target="_blank">
                      Open file
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            {!asset ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="file">File</Label>
                <Input
                  accept={allowedAssetMimeTypes.join(",")}
                  id="file"
                  name="file"
                  type="file"
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  Supported: JPG, PNG, WebP, SVG, PDF, DOC, DOCX, PPT, PPTX. Maximum size 10MB.
                </p>
                <FieldError message={state.errors?.file} />
              </div>
            ) : null}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Asset name</Label>
              <Input defaultValue={defaultName} id="name" name="name" />
              <FieldError message={state.errors?.name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
                id="client_id"
                name="client_id"
                onChange={(event) => {
                  const nextClientId = event.target.value;
                  setSelectedClientId(nextClientId);

                  if (
                    selectedCampaignId &&
                    !campaigns.some(
                      (campaign) =>
                        campaign.id === selectedCampaignId &&
                        campaign.client_id === nextClientId,
                    )
                  ) {
                    setSelectedCampaignId("");
                  }
                }}
                value={selectedClientId}
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <FieldError message={state.errors?.client_id} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign_id">Campaign</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedClientId}
                id="campaign_id"
                name="campaign_id"
                onChange={(event) => {
                  setSelectedCampaignId(event.target.value);
                }}
                value={selectedCampaignId}
              >
                <option value="">
                  {selectedClientId ? "General client asset" : "Select a client first"}
                </option>
                {availableCampaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
              </select>
              <p className="text-sm leading-6 text-muted-foreground">
                Campaign selection is optional. When blank, the asset stays at client level.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                defaultValue={defaultTags}
                id="tags"
                name="tags"
                placeholder="logo, offer sheet, testimonial"
              />
              <p className="text-sm leading-6 text-muted-foreground">
                Separate tags with commas to keep search and filtering clean.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                defaultValue={defaultNotes}
                id="notes"
                name="notes"
                placeholder="Add usage notes, source context, or approval caveats."
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-muted-foreground">
              {mode === "create"
                ? "Uploads save to Supabase Storage and create a linked asset record in the current agency scope."
                : "Only metadata is editable here. File replacement is intentionally deferred for this MVP."}
            </p>
            <div className="flex gap-3">
              {returnTo ? (
                <Button asChild type="button" variant="outline">
                  <Link href={returnTo as Route}>Cancel</Link>
                </Button>
              ) : null}
              <SubmitButton mode={mode} />
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
