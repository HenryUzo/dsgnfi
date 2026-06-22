import { zodTextFormat } from "openai/helpers/zod";

import {
  campaignGenerationSystemPrompt,
  buildCampaignGenerationUserPrompt,
} from "@/lib/ai/prompts";
import {
  campaignStrategyCalendarSchema,
  validateCampaignStrategyCalendarOutput,
} from "@/lib/ai/schemas";
import type {
  CampaignGenerationContext,
  CampaignGenerationPromptInput,
  CampaignGenerationResult,
  CampaignStrategyCalendarOutput,
} from "@/lib/ai/types";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai/server";
import type { Json } from "@/types/database";

const MAX_GENERATION_ATTEMPTS = 2;

function getStringArray(value: Json | null | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getFaqArray(value: Json | null | undefined) {
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
        .filter((item) => item.question.length > 0 && item.answer.length > 0)
    : [];
}

function includesSensitiveIndustryKeyword(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return /(vet|veterinary|health|medical|finance|financial|legal|law|safety|insurance)/i.test(
    value,
  );
}

export function buildCampaignGenerationPromptInput(
  context: CampaignGenerationContext,
): CampaignGenerationPromptInput {
  const brandProfile = context.brand_profile;
  const platforms = getStringArray(context.campaign.platforms);
  const contentTypes = getStringArray(context.campaign.content_types);
  const services = getStringArray(brandProfile?.services);
  const offerExamples = getStringArray(brandProfile?.offer_examples);
  const wordsToAvoid = getStringArray(brandProfile?.words_to_avoid);

  return {
    agency: context.agency,
    brand_profile: brandProfile
      ? {
          brand_summary: brandProfile.brand_summary,
          common_objections: getStringArray(brandProfile.common_objections),
          competitors: getStringArray(brandProfile.competitors),
          content_pillars: getStringArray(brandProfile.content_pillars),
          facebook_notes: brandProfile.facebook_notes,
          faqs: getFaqArray(brandProfile.faqs),
          gbp_notes: brandProfile.gbp_notes,
          instagram_notes: brandProfile.instagram_notes,
          offer_examples: offerExamples,
          preferred_ctas: getStringArray(brandProfile.preferred_ctas),
          services,
          target_audience: brandProfile.target_audience,
          tone_of_voice: brandProfile.tone_of_voice,
          words_to_avoid: wordsToAvoid,
          words_to_use: getStringArray(brandProfile.words_to_use),
        }
      : null,
    campaign: {
      campaign_theme: context.campaign.campaign_theme,
      cta: context.campaign.cta,
      end_date: context.campaign.end_date,
      id: context.campaign.id,
      internal_notes: context.campaign.internal_notes,
      key_message: context.campaign.key_message,
      number_of_posts: context.campaign.number_of_posts,
      objective: context.campaign.objective,
      offer: context.campaign.offer,
      platforms,
      start_date: context.campaign.start_date,
      status: context.campaign.status,
      target_audience: context.campaign.target_audience,
      title: context.campaign.title,
      tone: context.campaign.tone,
    },
    client: {
      contact_email: context.client.contact_email,
      contact_name: context.client.contact_name,
      description: context.client.description,
      id: context.client.id,
      industry: context.client.industry,
      location: context.client.location,
      name: context.client.name,
      website: context.client.website,
    },
    generation_rules: {
      allowed_content_types: contentTypes,
      allowed_platforms: platforms,
      avoid_exaggerated_claims:
        includesSensitiveIndustryKeyword(context.client.industry) ||
        services.some((service) => includesSensitiveIndustryKeyword(service)),
      must_generate_item_count:
        context.campaign.number_of_posts > 0
          ? context.campaign.number_of_posts
          : { max: 10, min: 5 },
      prohibit_words: wordsToAvoid,
      supported_locations: context.client.location ? [context.client.location] : [],
      supported_offers: [
        context.campaign.offer,
        ...offerExamples,
      ].filter((value): value is string => typeof value === "string" && value.trim().length > 0),
      supported_services: services,
    },
  };
}

export function validateCampaignGenerationContext(
  promptInput: CampaignGenerationPromptInput,
) {
  if (promptInput.generation_rules.allowed_platforms.length === 0) {
    throw new Error(
      "Add at least one platform to the campaign before generating strategy and calendar items.",
    );
  }

  if (promptInput.generation_rules.allowed_content_types.length === 0) {
    throw new Error(
      "Add at least one content type to the campaign before generating strategy and calendar items.",
    );
  }
}

type OpenAIGenerationResponse = {
  modelUsed: string;
  output: CampaignStrategyCalendarOutput;
};

export async function generateCampaignStrategyAndCalendar(
  promptInput: CampaignGenerationPromptInput,
): Promise<OpenAIGenerationResponse> {
  validateCampaignGenerationContext(promptInput);

  const client = getOpenAIClient();
  const model = getOpenAIModel();
  let retryFeedback: string | undefined;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const response = await client.responses.parse({
      input: buildCampaignGenerationUserPrompt(promptInput, retryFeedback),
      instructions: campaignGenerationSystemPrompt,
      model,
      text: {
        format: zodTextFormat(
          campaignStrategyCalendarSchema,
          "campaign_strategy_calendar_output",
        ),
      },
    });

    const parsedOutput = response.output_parsed;

    if (!parsedOutput) {
      retryFeedback = "No structured JSON output was returned.";
      continue;
    }

    try {
      validateCampaignStrategyCalendarOutput(parsedOutput, promptInput);

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
    retryFeedback ?? "The AI output could not be validated for this campaign.",
  );
}

export function getGenerationSummaryText(result: CampaignGenerationResult) {
  return `${result.output.calendar_items.length} draft calendar items were generated with ${result.modelUsed}.`;
}
