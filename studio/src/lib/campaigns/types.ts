import type { CampaignStatus } from "@/types/database";

export type CampaignFormValues = {
  campaign_theme: string;
  client_id: string;
  content_types: string[];
  cta: string;
  end_date: string;
  internal_notes: string;
  key_message: string;
  number_of_posts: string;
  objective: string;
  offer: string;
  platforms: string[];
  start_date: string;
  status: CampaignStatus;
  target_audience: string;
  title: string;
  tone: string;
};

export type CampaignFormState = {
  errors?: Partial<
    Record<
      | "client_id"
      | "content_types"
      | "end_date"
      | "number_of_posts"
      | "platforms"
      | "start_date"
      | "title",
      string
    >
  >;
  message?: string;
  status: "error" | "idle" | "success";
  values?: CampaignFormValues;
};

export const initialCampaignFormState: CampaignFormState = {
  status: "idle",
};

export const campaignStatusOptions: Array<{
  label: string;
  value: CampaignStatus;
}> = [
  { label: "Draft", value: "draft" },
  { label: "Planning", value: "planning" },
  { label: "Content Generated", value: "content_generated" },
  { label: "In Review", value: "in_review" },
  { label: "Approved", value: "approved" },
  { label: "Completed", value: "completed" },
];

export const campaignPlatformOptions = [
  "Instagram",
  "Facebook",
  "Google Business Profile",
  "LinkedIn",
  "TikTok",
  "Email",
  "Blog",
] as const;

export const campaignContentTypeOptions = [
  "Instagram Caption",
  "Facebook Caption",
  "Google Business Profile Post",
  "Carousel",
  "Reel Script",
  "Static Post",
  "Ad Copy Draft",
  "Hashtag Set",
  "Creative Direction",
  "Blog Outline",
  "Email Copy",
] as const;
