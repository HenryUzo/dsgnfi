import { z } from "zod";

import type {
  CampaignGenerationPromptInput,
  CampaignStrategyCalendarItem,
  CampaignStrategyCalendarOutput,
  ContentDraftOutput,
  ContentDraftPromptInput,
} from "@/lib/ai/types";
import type { Json } from "@/types/database";

const calendarItemSchema = z.object({
  caption_or_script_summary: z.string().trim().min(1),
  cta: z.string().trim().min(1),
  content_type: z.string().trim().min(1),
  hashtags: z.array(z.string().trim().min(1)).default([]),
  hook: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  suggested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(1),
});

export const campaignStrategyCalendarSchema = z.object({
  calendar_items: z.array(calendarItemSchema),
  campaign_summary: z.string().trim().min(1),
  content_pillars: z.array(z.string().trim().min(1)).min(1),
  creative_direction: z.string().trim().min(1),
  recommended_ctas: z.array(z.string().trim().min(1)).min(1),
  strategy_angle: z.string().trim().min(1),
});

export function parseCampaignStrategyCalendarOutput(
  value: Json,
): CampaignStrategyCalendarOutput | null {
  const parsed = campaignStrategyCalendarSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function listAllOutputStrings(output: CampaignStrategyCalendarOutput) {
  const itemStrings = output.calendar_items.flatMap((item) => [
    item.title,
    item.platform,
    item.content_type,
    item.suggested_date,
    item.objective,
    item.hook,
    item.caption_or_script_summary,
    item.cta,
    ...item.hashtags,
  ]);

  return [
    output.campaign_summary,
    output.strategy_angle,
    ...output.content_pillars,
    ...output.recommended_ctas,
    output.creative_direction,
    ...itemStrings,
  ];
}

function ensureDateWithinRange(
  suggestedDate: string,
  startDate: string | null,
  endDate: string | null,
  item: CampaignStrategyCalendarItem,
) {
  if (!startDate && !endDate) {
    return;
  }

  if (startDate && suggestedDate < startDate) {
    throw new Error(
      `Generated date ${item.suggested_date} falls before the campaign start date.`,
    );
  }

  if (endDate && suggestedDate > endDate) {
    throw new Error(
      `Generated date ${item.suggested_date} falls after the campaign end date.`,
    );
  }
}

export function validateCampaignStrategyCalendarOutput(
  output: CampaignStrategyCalendarOutput,
  promptInput: CampaignGenerationPromptInput,
) {
  const expectedCount = promptInput.campaign.number_of_posts;
  const generatedCount = output.calendar_items.length;

  if (expectedCount > 0 && generatedCount !== expectedCount) {
    throw new Error(
      `The AI returned ${generatedCount} calendar items, but the campaign requires exactly ${expectedCount}.`,
    );
  }

  if (expectedCount === 0 && (generatedCount < 5 || generatedCount > 10)) {
    throw new Error(
      "The AI must return between 5 and 10 calendar items when number_of_posts is 0.",
    );
  }

  const allowedPlatforms = new Set(
    promptInput.generation_rules.allowed_platforms.map(normalizeText),
  );
  const allowedContentTypes = new Set(
    promptInput.generation_rules.allowed_content_types.map(normalizeText),
  );

  for (const item of output.calendar_items) {
    if (!allowedPlatforms.has(normalizeText(item.platform))) {
      throw new Error(`Generated platform "${item.platform}" is not allowed for this campaign.`);
    }

    if (!allowedContentTypes.has(normalizeText(item.content_type))) {
      throw new Error(
        `Generated content type "${item.content_type}" is not allowed for this campaign.`,
      );
    }

    ensureDateWithinRange(
      item.suggested_date,
      promptInput.campaign.start_date,
      promptInput.campaign.end_date,
      item,
    );
  }

  const prohibitedWords = promptInput.generation_rules.prohibit_words
    .map((word) => word.trim())
    .filter((word) => word.length > 0);

  if (prohibitedWords.length === 0) {
    return;
  }

  const outputStrings = listAllOutputStrings(output).map(normalizeText);

  for (const word of prohibitedWords) {
    const normalizedWord = normalizeText(word);

    if (outputStrings.some((value) => value.includes(normalizedWord))) {
      throw new Error(`The AI output used a prohibited brand term: "${word}".`);
    }
  }
}

export const contentDraftSchema = z.object({
  cta: z.string().trim().min(1),
  content_type: z.string().trim().min(1),
  creative_direction: z.string().trim().min(1),
  hashtags: z.array(z.string().trim().min(1)).default([]),
  hook: z.string().trim().min(1),
  main_copy: z.string().trim().min(1),
  notes: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  title: z.string().trim().min(1),
});

export function parseContentDraftOutput(value: Json): ContentDraftOutput | null {
  const parsed = contentDraftSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}

export function validateContentDraftOutput(
  output: ContentDraftOutput,
  promptInput: ContentDraftPromptInput,
) {
  if (normalizeText(output.platform) !== normalizeText(promptInput.generation_rules.allowed_platform)) {
    throw new Error(
      `Generated platform "${output.platform}" does not match the content item's platform.`,
    );
  }

  if (
    normalizeText(output.content_type) !==
    normalizeText(promptInput.generation_rules.allowed_content_type)
  ) {
    throw new Error(
      `Generated content type "${output.content_type}" does not match the content item type.`,
    );
  }

  const prohibitedWords = promptInput.generation_rules.prohibit_words
    .map((word) => word.trim())
    .filter((word) => word.length > 0);

  if (prohibitedWords.length === 0) {
    return;
  }

  const outputStrings = [
    output.title,
    output.hook,
    output.main_copy,
    output.cta,
    output.creative_direction,
    output.notes,
    ...output.hashtags,
  ].map(normalizeText);

  for (const word of prohibitedWords) {
    const normalizedWord = normalizeText(word);

    if (outputStrings.some((value) => value.includes(normalizedWord))) {
      throw new Error(`The AI output used a prohibited brand term: "${word}".`);
    }
  }
}
