import { zodTextFormat } from "openai/helpers/zod";

import {
  buildContentDraftGenerationUserPrompt,
  contentDraftGenerationSystemPrompt,
} from "@/lib/ai/prompts";
import {
  contentDraftSchema,
  validateContentDraftOutput,
} from "@/lib/ai/schemas";
import type {
  ContentDraftOutput,
  ContentDraftPromptInput,
} from "@/lib/ai/types";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai/server";
import type { ContentGenerationContext } from "@/lib/db/content-items";
import type { Json } from "@/types/database";

const MAX_GENERATION_ATTEMPTS = 2;

function getStringArray(value: Json | null | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getMetadataSummary(value: Json | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const summary = (value as Record<string, Json | undefined>).caption_or_script_summary;

  return typeof summary === "string" ? summary : null;
}

function includesSensitiveIndustryKeyword(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return /(vet|veterinary|health|medical|finance|financial|legal|law|safety|insurance)/i.test(
    value,
  );
}

export function buildContentDraftPromptInput(
  context: ContentGenerationContext,
): ContentDraftPromptInput {
  const brandProfile = context.brand_profile;
  const services = getStringArray(brandProfile?.services);
  const offers = [
    context.campaign?.offer,
    ...getStringArray(brandProfile?.preferred_ctas),
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return {
    agency: context.agency,
    brand_profile: brandProfile
      ? {
          brand_summary: brandProfile.brand_summary,
          facebook_notes: brandProfile.facebook_notes,
          gbp_notes: brandProfile.gbp_notes,
          instagram_notes: brandProfile.instagram_notes,
          preferred_ctas: getStringArray(brandProfile.preferred_ctas),
          services,
          target_audience: brandProfile.target_audience,
          tone_of_voice: brandProfile.tone_of_voice,
          words_to_avoid: getStringArray(brandProfile.words_to_avoid),
          words_to_use: getStringArray(brandProfile.words_to_use),
        }
      : null,
    campaign: context.campaign
      ? {
          campaign_theme: context.campaign.campaign_theme,
          cta: context.campaign.cta,
          key_message: context.campaign.key_message,
          objective: context.campaign.objective,
          offer: context.campaign.offer,
          target_audience: context.campaign.target_audience,
          title: context.campaign.title,
          tone: context.campaign.tone,
        }
      : null,
    client: {
      description: context.client.description,
      industry: context.client.industry,
      location: context.client.location,
      name: context.client.name,
      website: context.client.website,
    },
    content_item: {
      cta: context.content_item.cta,
      hashtags: getStringArray(context.content_item.hashtags),
      hook: context.content_item.hook,
      metadata_summary: getMetadataSummary(context.content_item.metadata),
      objective: context.content_item.objective,
      platform: context.content_item.platform,
      suggested_date: context.content_item.suggested_date,
      title: context.content_item.title,
      type: context.content_item.content_type,
    },
    generation_rules: {
      allowed_content_type: context.content_item.content_type,
      allowed_platform: context.content_item.platform,
      avoid_exaggerated_claims:
        includesSensitiveIndustryKeyword(context.client.industry) ||
        services.some((service) => includesSensitiveIndustryKeyword(service)),
      prohibit_words: getStringArray(brandProfile?.words_to_avoid),
      supported_locations: context.client.location ? [context.client.location] : [],
      supported_offers: offers,
      supported_services: services,
    },
    latest_variant: context.latest_variant
      ? {
          ai_generated_copy: context.latest_variant.ai_generated_copy,
          creative_direction: context.latest_variant.creative_direction,
          edited_copy: context.latest_variant.edited_copy,
        }
      : null,
  };
}

export async function generateContentDraft(
  promptInput: ContentDraftPromptInput,
): Promise<{ modelUsed: string; output: ContentDraftOutput }> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  let retryFeedback: string | undefined;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const response = await client.responses.parse({
      input: buildContentDraftGenerationUserPrompt(promptInput, retryFeedback),
      instructions: contentDraftGenerationSystemPrompt,
      model,
      text: {
        format: zodTextFormat(contentDraftSchema, "content_item_draft_output"),
      },
    });

    const parsedOutput = response.output_parsed;

    if (!parsedOutput) {
      retryFeedback = "No structured JSON output was returned.";
      continue;
    }

    try {
      validateContentDraftOutput(parsedOutput, promptInput);

      return {
        modelUsed: response.model,
        output: parsedOutput,
      };
    } catch (error) {
      retryFeedback =
        error instanceof Error ? error.message : "The output did not pass validation.";
    }
  }

  throw new Error(
    retryFeedback ?? "The AI output could not be validated for this content item.",
  );
}
