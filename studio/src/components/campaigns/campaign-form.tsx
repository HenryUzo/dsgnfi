"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { MultiOptionInput } from "@/components/campaigns/multi-option-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createCampaignAction,
  updateCampaignAction,
} from "@/lib/campaigns/actions";
import {
  campaignContentTypeOptions,
  campaignPlatformOptions,
  campaignStatusOptions,
  initialCampaignFormState,
  type CampaignFormState,
} from "@/lib/campaigns/types";
import type { CampaignWithClient } from "@/lib/db/campaigns";
import type { Client, Json } from "@/types/database";

function SubmitButton({ idleLabel, pendingLabel }: { idleLabel: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-200">{message}</p>;
}

function getStringArray(value: Json | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

type CampaignFormProps = {
  campaign?: CampaignWithClient;
  clients: Client[];
  description: string;
  preselectedClientId?: string;
  title: string;
};

export function CampaignForm({
  campaign,
  clients,
  description,
  preselectedClientId,
  title,
}: CampaignFormProps) {
  const action = campaign ? updateCampaignAction : createCampaignAction;
  const [state, formAction] = useActionState<CampaignFormState, FormData>(
    action,
    initialCampaignFormState,
  );
  const values = state.values;
  const selectedClientId =
    values?.client_id ?? campaign?.client_id ?? preselectedClientId ?? "";
  const selectedStatus = values?.status ?? campaign?.status ?? "draft";
  const selectedPlatforms =
    values?.platforms ?? (campaign ? getStringArray(campaign.platforms) : []);
  const selectedContentTypes =
    values?.content_types ??
    (campaign ? getStringArray(campaign.content_types) : []);

  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form action={formAction} className="grid gap-6">
          {campaign ? (
            <input name="campaignId" type="hidden" value={campaign.id} />
          ) : null}
          <AuthFeedback
            message={state.message}
            tone={state.status === "success" ? "success" : "error"}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
                defaultValue={selectedClientId}
                id="client_id"
                name="client_id"
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
              <Label htmlFor="status">Status</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
                defaultValue={selectedStatus}
                id="status"
                name="status"
              >
                {campaignStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Campaign title</Label>
              <Input
                defaultValue={values?.title ?? campaign?.title ?? ""}
                id="title"
                name="title"
              />
              <FieldError message={state.errors?.title} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="objective">Objective</Label>
              <Textarea
                defaultValue={values?.objective ?? campaign?.objective ?? ""}
                id="objective"
                name="objective"
                placeholder="What should this campaign accomplish?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_audience">Target audience</Label>
              <Textarea
                defaultValue={values?.target_audience ?? campaign?.target_audience ?? ""}
                id="target_audience"
                name="target_audience"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer">Offer</Label>
              <Textarea
                defaultValue={values?.offer ?? campaign?.offer ?? ""}
                id="offer"
                name="offer"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="campaign_theme">Campaign theme</Label>
              <Textarea
                defaultValue={values?.campaign_theme ?? campaign?.campaign_theme ?? ""}
                id="campaign_theme"
                name="campaign_theme"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Start date</Label>
              <Input
                defaultValue={values?.start_date ?? campaign?.start_date ?? ""}
                id="start_date"
                name="start_date"
                type="date"
              />
              <FieldError message={state.errors?.start_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End date</Label>
              <Input
                defaultValue={values?.end_date ?? campaign?.end_date ?? ""}
                id="end_date"
                name="end_date"
                type="date"
              />
              <FieldError message={state.errors?.end_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number_of_posts">Number of posts</Label>
              <Input
                defaultValue={values?.number_of_posts ?? String(campaign?.number_of_posts ?? 0)}
                id="number_of_posts"
                min={0}
                name="number_of_posts"
                type="number"
              />
              <FieldError message={state.errors?.number_of_posts} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Textarea
                defaultValue={values?.tone ?? campaign?.tone ?? ""}
                id="tone"
                name="tone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key_message">Key message</Label>
              <Textarea
                defaultValue={values?.key_message ?? campaign?.key_message ?? ""}
                id="key_message"
                name="key_message"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta">CTA</Label>
              <Textarea
                defaultValue={values?.cta ?? campaign?.cta ?? ""}
                id="cta"
                name="cta"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="internal_notes">Internal notes</Label>
              <Textarea
                defaultValue={values?.internal_notes ?? campaign?.internal_notes ?? ""}
                id="internal_notes"
                name="internal_notes"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <MultiOptionInput
                key={`platforms-${selectedPlatforms.join("|")}`}
                description="Choose the channels this campaign needs to cover."
                label="Platforms"
                name="platforms"
                options={campaignPlatformOptions}
                value={selectedPlatforms}
              />
              <FieldError message={state.errors?.platforms} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <MultiOptionInput
                key={`content-types-${selectedContentTypes.join("|")}`}
                description="Choose the working deliverables the team needs to plan."
                label="Content types"
                name="content_types"
                options={campaignContentTypeOptions}
                value={selectedContentTypes}
              />
              <FieldError message={state.errors?.content_types} />
            </div>
          </div>
          <div className="flex justify-end">
            <SubmitButton
              idleLabel={campaign ? "Save campaign" : "Create campaign"}
              pendingLabel={campaign ? "Saving campaign" : "Creating campaign"}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
