import type {
  AIGeneration,
  Agency,
  BrandProfile,
  Campaign,
  Client,
  ContentItem,
  ContentVariant,
} from "@/types/database";

export const CAMPAIGN_STRATEGY_GENERATION_TYPE = "campaign_strategy_calendar";
export const CONTENT_ITEM_DRAFT_GENERATION_TYPE = "content_item_draft";

export type CampaignStrategyCalendarItem = {
  caption_or_script_summary: string;
  cta: string;
  content_type: string;
  hashtags: string[];
  hook: string;
  objective: string;
  platform: string;
  suggested_date: string;
  title: string;
};

export type CampaignStrategyCalendarOutput = {
  calendar_items: CampaignStrategyCalendarItem[];
  campaign_summary: string;
  content_pillars: string[];
  creative_direction: string;
  recommended_ctas: string[];
  strategy_angle: string;
};

export type CampaignGenerationPromptInput = {
  agency: Pick<Agency, "id" | "name" | "slug">;
  brand_profile: {
    brand_summary: string | null;
    common_objections: string[];
    competitors: string[];
    content_pillars: string[];
    faqs: Array<{ answer: string; question: string }>;
    facebook_notes: string | null;
    gbp_notes: string | null;
    instagram_notes: string | null;
    offer_examples: string[];
    preferred_ctas: string[];
    services: string[];
    target_audience: string | null;
    tone_of_voice: string | null;
    words_to_avoid: string[];
    words_to_use: string[];
  } | null;
  campaign: {
    campaign_theme: string | null;
    cta: string | null;
    end_date: string | null;
    id: string;
    internal_notes: string | null;
    key_message: string | null;
    number_of_posts: number;
    objective: string | null;
    offer: string | null;
    platforms: string[];
    start_date: string | null;
    status: Campaign["status"];
    target_audience: string | null;
    title: string;
    tone: string | null;
  };
  client: {
    contact_email: string | null;
    contact_name: string | null;
    description: string | null;
    id: string;
    industry: string | null;
    location: string | null;
    name: string;
    website: string | null;
  };
  generation_rules: {
    allowed_content_types: string[];
    allowed_platforms: string[];
    avoid_exaggerated_claims: boolean;
    must_generate_item_count: number | { max: number; min: number };
    prohibit_words: string[];
    supported_locations: string[];
    supported_offers: string[];
    supported_services: string[];
  };
};

export type CampaignGenerationContext = {
  agency: Pick<Agency, "id" | "name" | "slug">;
  brand_profile: BrandProfile | null;
  campaign: Campaign;
  client: Client;
};

export type CampaignGenerationActionState = {
  message?: string;
  status: "error" | "idle" | "success";
};

export type ContentDraftOutput = {
  cta: string;
  content_type: string;
  creative_direction: string;
  hashtags: string[];
  hook: string;
  main_copy: string;
  notes: string;
  platform: string;
  title: string;
};

export type ContentDraftPromptInput = {
  agency: Pick<Agency, "id" | "name" | "slug">;
  brand_profile: {
    brand_summary: string | null;
    facebook_notes: string | null;
    gbp_notes: string | null;
    instagram_notes: string | null;
    preferred_ctas: string[];
    services: string[];
    target_audience: string | null;
    tone_of_voice: string | null;
    words_to_avoid: string[];
    words_to_use: string[];
  } | null;
  campaign: {
    campaign_theme: string | null;
    cta: string | null;
    key_message: string | null;
    objective: string | null;
    offer: string | null;
    target_audience: string | null;
    title: string;
    tone: string | null;
  } | null;
  client: {
    description: string | null;
    industry: string | null;
    location: string | null;
    name: string;
    website: string | null;
  };
  content_item: {
    cta: string | null;
    hashtags: string[];
    hook: string | null;
    metadata_summary: string | null;
    objective: string | null;
    platform: string;
    suggested_date: string | null;
    title: string;
    type: string;
  };
  generation_rules: {
    allowed_content_type: string;
    allowed_platform: string;
    avoid_exaggerated_claims: boolean;
    prohibit_words: string[];
    supported_locations: string[];
    supported_offers: string[];
    supported_services: string[];
  };
  latest_variant: {
    ai_generated_copy: string | null;
    creative_direction: string | null;
    edited_copy: string | null;
  } | null;
};

export type ContentDraftGenerationResult = {
  generation: AIGeneration;
  modelUsed: string;
  output: ContentDraftOutput;
  savedVariant: ContentVariant;
};

export type CampaignGenerationResult = {
  generation: AIGeneration;
  modelUsed: string;
  output: CampaignStrategyCalendarOutput;
  savedContentItems: ContentItem[];
};

export const initialCampaignGenerationActionState: CampaignGenerationActionState = {
  status: "idle",
};
