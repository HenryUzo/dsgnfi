"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { FAQInput } from "@/components/clients/faq-input";
import { ListInput } from "@/components/clients/list-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertBrandProfileAction } from "@/lib/clients/actions";
import {
  initialBrandProfileFormState,
  type BrandProfileFormState,
} from "@/lib/clients/types";
import type { BrandProfile, Json } from "@/types/database";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {pending ? "Saving brand profile" : "Save brand profile"}
    </Button>
  );
}

function getStringArray(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getFaqArray(value: Json) {
  return Array.isArray(value)
    ? value
        .filter((item) => typeof item === "object" && item !== null && !Array.isArray(item))
        .map((item) => ({
          answer:
            typeof (item as Record<string, Json | undefined>).answer === "string"
              ? ((item as Record<string, Json | undefined>).answer as string)
              : "",
          question:
            typeof (item as Record<string, Json | undefined>).question === "string"
              ? ((item as Record<string, Json | undefined>).question as string)
              : "",
        }))
    : [];
}

export function BrandProfileForm({
  clientId,
  profile,
}: {
  clientId: string;
  profile: BrandProfile | null;
}) {
  const [state, action] = useActionState<BrandProfileFormState, FormData>(
    upsertBrandProfileAction,
    initialBrandProfileFormState,
  );

  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">Brand Profile</CardTitle>
        <CardDescription className="leading-6">
          This is the client memory layer that should shape future strategy and AI output quality.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form action={action} className="grid gap-6">
          <input name="clientId" type="hidden" value={clientId} />
          <AuthFeedback
            message={state.message}
            tone={state.status === "success" ? "success" : "error"}
          />
          <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="brand_summary">Brand summary</Label>
              <Textarea
                defaultValue={profile?.brand_summary ?? ""}
                id="brand_summary"
                name="brand_summary"
                placeholder="Summarize the brand promise, positioning, and what the team should never forget."
              />
            </div>

            <ListInput
              description="Capture the services the brand actively wants the team to emphasize."
              label="Services"
              name="services"
              value={profile ? getStringArray(profile.services) : []}
            />
            <ListInput
              description="List the core themes that should organize the content plan."
              label="Content pillars"
              name="content_pillars"
              value={profile ? getStringArray(profile.content_pillars) : []}
            />
            <FAQInput
              name="faqs"
              value={profile ? getFaqArray(profile.faqs) : []}
            />
            <ListInput
              description="Note the objections the content needs to handle calmly and clearly."
              label="Common objections"
              name="common_objections"
              value={profile ? getStringArray(profile.common_objections) : []}
            />
            <ListInput
              description="Store approved CTA phrasing the team can reuse."
              label="Preferred CTAs"
              name="preferred_ctas"
              value={profile ? getStringArray(profile.preferred_ctas) : []}
            />
            <ListInput
              description="Words and phrases that should appear often."
              label="Words to use"
              name="words_to_use"
              value={profile ? getStringArray(profile.words_to_use) : []}
            />
            <ListInput
              description="Words and phrases to avoid in all content."
              label="Words to avoid"
              name="words_to_avoid"
              value={profile ? getStringArray(profile.words_to_avoid) : []}
            />
            <ListInput
              description="Reference competitor names or categories for positioning context."
              label="Competitors"
              name="competitors"
              value={profile ? getStringArray(profile.competitors) : []}
            />
            <ListInput
              description="Offer examples, promos, or recurring commercial angles."
              label="Offer examples"
              name="offer_examples"
              value={profile ? getStringArray(profile.offer_examples) : []}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="target_audience">Target audience</Label>
                <Textarea
                  defaultValue={profile?.target_audience ?? ""}
                  id="target_audience"
                  name="target_audience"
                  placeholder="Describe the audience segments this client serves best."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone_of_voice">Tone of voice</Label>
                <Textarea
                  defaultValue={profile?.tone_of_voice ?? ""}
                  id="tone_of_voice"
                  name="tone_of_voice"
                  placeholder="Explain the tone, pace, and emotional posture the brand expects."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_notes">Instagram notes</Label>
                <Textarea
                  defaultValue={profile?.instagram_notes ?? ""}
                  id="instagram_notes"
                  name="instagram_notes"
                  placeholder="Platform-specific guidance for Instagram content."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook_notes">Facebook notes</Label>
                <Textarea
                  defaultValue={profile?.facebook_notes ?? ""}
                  id="facebook_notes"
                  name="facebook_notes"
                  placeholder="Platform-specific guidance for Facebook content."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gbp_notes">Google Business Profile notes</Label>
              <Textarea
                defaultValue={profile?.gbp_notes ?? ""}
                id="gbp_notes"
                name="gbp_notes"
                placeholder="Keep this practical and local-intent oriented."
              />
            </div>
          </div>
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
