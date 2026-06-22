import type {
  Agency,
  BrandProfile,
  Campaign,
  CampaignStatus,
  Client,
} from "@/types/database";

import { assertNoDbError, createDbClient } from "@/lib/db/shared";
import type { CampaignGenerationContext } from "@/lib/ai/types";

type FetchCampaignsOptions = {
  agencyId: string;
  clientId?: string;
  query?: string;
  status?:
    | "all"
    | "approved"
    | "completed"
    | "content_generated"
    | "draft"
    | "in_review"
    | "planning";
};

export type CampaignWithClient = Campaign & {
  client: {
    id: string;
    name: string;
  } | null;
};

export type CampaignWithClientBrandProfile = Campaign & {
  agency: Pick<Agency, "id" | "name" | "slug"> | null;
  brand_profile: BrandProfile | null;
  client: Client | null;
};

export type CampaignOverviewStats = {
  approvedPosts: number;
  contentItemCount: number;
  pendingReviews: number;
};

export async function fetchCampaignsForAgency(options: FetchCampaignsOptions) {
  const supabase = await createDbClient();
  let query = supabase
    .from("campaigns")
    .select("*, client:clients(id, name)")
    .eq("agency_id", options.agencyId)
    .order("created_at", { ascending: false });

  if (options.clientId) {
    query = query.eq("client_id", options.clientId);
  }

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options.query) {
    const sanitizedSearch = options.query.replace(/,/g, " ");
    query = query.or(
      `title.ilike.%${sanitizedSearch}%,objective.ilike.%${sanitizedSearch}%,campaign_theme.ilike.%${sanitizedSearch}%`,
    );
  }

  const { data, error } = await query;
  assertNoDbError(error, "Failed to fetch campaigns");

  return (data ?? []) as CampaignWithClient[];
}

export async function fetchCampaignById(agencyId: string, campaignId: string) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, client:clients(id, name)")
    .eq("agency_id", agencyId)
    .eq("id", campaignId)
    .maybeSingle();

  assertNoDbError(error, "Failed to fetch campaign");

  return (data ?? null) as CampaignWithClient | null;
}

export async function fetchCampaignGenerationContext(
  agencyId: string,
  campaignId: string,
): Promise<CampaignGenerationContext | null> {
  const supabase = await createDbClient();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*, agency:agencies(id, name, slug), client:clients(*)")
    .eq("agency_id", agencyId)
    .eq("id", campaignId)
    .maybeSingle();

  assertNoDbError(campaignError, "Failed to fetch campaign generation context");

  const typedCampaign = (campaign ?? null) as CampaignWithClientBrandProfile | null;

  if (!typedCampaign?.client || !typedCampaign.agency) {
    return null;
  }

  const { data: brandProfile, error: brandProfileError } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("client_id", typedCampaign.client.id)
    .maybeSingle();

  assertNoDbError(
    brandProfileError,
    "Failed to fetch campaign brand profile context",
  );

  return {
    agency: typedCampaign.agency,
    brand_profile: (brandProfile ?? null) as BrandProfile | null,
    campaign: {
      agency_id: typedCampaign.agency_id,
      campaign_theme: typedCampaign.campaign_theme,
      client_id: typedCampaign.client_id,
      content_types: typedCampaign.content_types,
      created_at: typedCampaign.created_at,
      cta: typedCampaign.cta,
      end_date: typedCampaign.end_date,
      id: typedCampaign.id,
      internal_notes: typedCampaign.internal_notes,
      key_message: typedCampaign.key_message,
      number_of_posts: typedCampaign.number_of_posts,
      objective: typedCampaign.objective,
      offer: typedCampaign.offer,
      platforms: typedCampaign.platforms,
      start_date: typedCampaign.start_date,
      status: typedCampaign.status,
      target_audience: typedCampaign.target_audience,
      title: typedCampaign.title,
      tone: typedCampaign.tone,
      updated_at: typedCampaign.updated_at,
    },
    client: typedCampaign.client,
  };
}

export async function fetchCampaignOverviewStats(
  agencyId: string,
  campaignId: string,
): Promise<CampaignOverviewStats> {
  const supabase = await createDbClient();

  const [contentItems, approvedPosts, pendingReviews] = await Promise.all([
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("campaign_id", campaignId),
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("campaign_id", campaignId)
      .eq("status", "approved"),
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("campaign_id", campaignId)
      .in("status", ["draft", "needs_review", "changes_requested"]),
  ]);

  assertNoDbError(contentItems.error, "Failed to fetch campaign content count");
  assertNoDbError(approvedPosts.error, "Failed to fetch approved posts count");
  assertNoDbError(pendingReviews.error, "Failed to fetch pending reviews count");

  return {
    approvedPosts: approvedPosts.count ?? 0,
    contentItemCount: contentItems.count ?? 0,
    pendingReviews: pendingReviews.count ?? 0,
  };
}

export async function updateCampaignStatus(
  agencyId: string,
  campaignId: string,
  status: CampaignStatus,
) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("agency_id", agencyId)
    .eq("id", campaignId)
    .select("*")
    .single();

  assertNoDbError(error, "Failed to update campaign status");

  return data as Campaign;
}
