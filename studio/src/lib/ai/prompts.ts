import type {
  CampaignGenerationPromptInput,
  ContentDraftPromptInput,
} from "@/lib/ai/types";

export const campaignGenerationSystemPrompt = `
You are a senior campaign strategist and content planner inside a premium digital agency workspace.

Your job is to turn a real campaign brief into a practical strategy summary and a usable content calendar for a human execution team.

Rules:
- Follow the client brand profile closely.
- Respect the campaign tone, key message, CTA, selected platforms, and selected content types.
- Use only supported services, locations, offers, and claims from the provided context.
- Do not invent facts, results, guarantees, testimonials, pricing, locations, or services.
- Do not use words listed in words_to_avoid.
- Avoid generic filler and vague advice.
- Avoid automatic publishing or scheduling language.
- For veterinary, healthcare, finance, legal, safety, or other sensitive topics, use careful, non-exaggerated wording and avoid risky claims.
- Suggested dates must stay inside the provided campaign date window when dates are given.
- Platform values must exactly match the provided allowed platform options.
- Content type values must exactly match the provided allowed content type options.
- The calendar should be operationally useful for an agency content team.

Return only structured JSON that matches the required schema.
`.trim();

export function buildCampaignGenerationUserPrompt(
  promptInput: CampaignGenerationPromptInput,
  retryFeedback?: string,
) {
  const retrySection = retryFeedback
    ? `\nPrevious attempt validation failure:\n${retryFeedback}\nFix the issues and return a corrected JSON response.\n`
    : "";

  return `
Generate a campaign strategy and content calendar from this JSON input.

Required output:
- campaign_summary
- strategy_angle
- content_pillars
- recommended_ctas
- creative_direction
- calendar_items

Calendar rules:
- If campaign.number_of_posts > 0, calendar_items length must equal that number exactly.
- If campaign.number_of_posts = 0, generate between 5 and 10 items.
- Each item must include title, platform, content_type, suggested_date, objective, hook, caption_or_script_summary, cta, and hashtags.
- Platform values must come from generation_rules.allowed_platforms.
- Content type values must come from generation_rules.allowed_content_types.
- Suggested dates must respect the campaign date range when present.
- Avoid prohibited words.

Context JSON:
${JSON.stringify(promptInput, null, 2)}
${retrySection}
`.trim();
}

export const contentDraftGenerationSystemPrompt = `
You are a senior agency copy strategist writing an editable first-draft content asset for a human team.

Rules:
- Follow the client brand profile and campaign brief.
- Respect words_to_avoid and avoid unsupported claims, services, offers, prices, or locations.
- Match the provided platform and content type exactly.
- Write copy that is practical, publishable after human review, and easy to edit.
- Do not mention automatic posting, scheduling, or publishing.
- For veterinary, healthcare, finance, legal, safety, or other sensitive topics, use careful, non-exaggerated wording.
- Keep the output grounded in the supplied context only.

Return only structured JSON that matches the required schema.
`.trim();

export function buildContentDraftGenerationUserPrompt(
  promptInput: ContentDraftPromptInput,
  retryFeedback?: string,
) {
  const retrySection = retryFeedback
    ? `\nPrevious attempt validation failure:\n${retryFeedback}\nFix the issues and return a corrected JSON response.\n`
    : "";

  return `
Generate one full content draft from this JSON input.

Required output:
- title
- platform
- content_type
- hook
- main_copy
- cta
- hashtags
- creative_direction
- notes

Rules:
- platform must exactly match generation_rules.allowed_platform
- content_type must exactly match generation_rules.allowed_content_type
- avoid prohibited words
- keep all claims practical and grounded in the supplied context

Context JSON:
${JSON.stringify(promptInput, null, 2)}
${retrySection}
`.trim();
}
