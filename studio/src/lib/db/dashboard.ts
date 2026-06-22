import type { AIGeneration, ActivityLog, Campaign, Client } from "@/types/database";

import { fetchAuthUserEmails, type ContentItemWithRelations } from "@/lib/db/content-items";
import { fetchAssets } from "@/lib/db/assets";
import { assertNoDbError, createDbClient } from "@/lib/db/shared";

export type DashboardMetrics = {
  activeCampaigns: number;
  activeClients: number;
  approvedContent: number;
  contentGenerated: number;
  contentNeedingReview: number;
  readyToPublishContent: number;
  totalAssets: number;
  totalCampaigns: number;
  totalClients: number;
};

export type RecentActivityEntry = ActivityLog & {
  user_email: string | null;
};

export type RecentAIGeneration = AIGeneration & {
  campaign_title: string | null;
  client_name: string | null;
};

export type RecentCampaign = Campaign & {
  client: Pick<Client, "id" | "name"> | null;
};

export type DashboardSnapshot = {
  metrics: DashboardMetrics;
  pendingReviews: ContentItemWithRelations[];
  recentActivity: RecentActivityEntry[];
  recentAIGenerations: RecentAIGeneration[];
  recentAssets: Awaited<ReturnType<typeof fetchAssets>>;
  recentCampaigns: RecentCampaign[];
  upcomingContent: ContentItemWithRelations[];
};

async function fetchCount(
  table:
    | "assets"
    | "campaigns"
    | "clients"
    | "content_items",
  agencyId: string,
  configure?: (
    query: ReturnType<Awaited<ReturnType<typeof createDbClient>>["from"]>,
  ) => ReturnType<Awaited<ReturnType<typeof createDbClient>>["from"]>,
) {
  const supabase = await createDbClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true }).eq("agency_id", agencyId);

  if (configure) {
    query = configure(query);
  }

  const { count, error } = await query;
  assertNoDbError(error, `Failed to fetch ${table} count`);

  return count ?? 0;
}

export async function fetchDashboardMetrics(agencyId: string): Promise<DashboardMetrics> {
  const [
    totalClients,
    activeClients,
    totalCampaigns,
    activeCampaigns,
    contentGenerated,
    contentNeedingReview,
    approvedContent,
    readyToPublishContent,
    totalAssets,
  ] = await Promise.all([
    fetchCount("clients", agencyId),
    fetchCount("clients", agencyId, (query) => query.eq("status", "active")),
    fetchCount("campaigns", agencyId),
    fetchCount("campaigns", agencyId, (query) =>
      query.in("status", ["draft", "planning", "content_generated", "in_review", "approved"]),
    ),
    fetchCount("content_items", agencyId),
    fetchCount("content_items", agencyId, (query) =>
      query.in("status", ["needs_review", "changes_requested"]),
    ),
    fetchCount("content_items", agencyId, (query) => query.eq("status", "approved")),
    fetchCount("content_items", agencyId, (query) => query.eq("status", "ready_to_publish")),
    fetchCount("assets", agencyId),
  ]);

  return {
    activeCampaigns,
    activeClients,
    approvedContent,
    contentGenerated,
    contentNeedingReview,
    readyToPublishContent,
    totalAssets,
    totalCampaigns,
    totalClients,
  };
}

export async function fetchRecentCampaigns(agencyId: string, limit = 5) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, client:clients(id, name)")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  assertNoDbError(error, "Failed to fetch recent campaigns");

  return (data ?? []) as RecentCampaign[];
}

export async function fetchUpcomingContent(agencyId: string, limit = 5) {
  const supabase = await createDbClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("content_items")
    .select("*, client:clients(id, name), campaign:campaigns(id, title)")
    .eq("agency_id", agencyId)
    .gte("suggested_date", today)
    .order("suggested_date", { ascending: true })
    .limit(limit);

  assertNoDbError(error, "Failed to fetch upcoming content");

  return (data ?? []) as ContentItemWithRelations[];
}

export async function fetchPendingReviewContent(agencyId: string, limit = 5) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*, client:clients(id, name), campaign:campaigns(id, title)")
    .eq("agency_id", agencyId)
    .in("status", ["needs_review", "changes_requested"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  assertNoDbError(error, "Failed to fetch pending review content");

  return (data ?? []) as ContentItemWithRelations[];
}

export async function fetchRecentActivity(agencyId: string, limit = 8) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  assertNoDbError(error, "Failed to fetch recent activity");

  const entries = (data ?? []) as ActivityLog[];
  const emailMap = await fetchAuthUserEmails(
    entries
      .map((entry) => entry.user_id)
      .filter((userId): userId is string => typeof userId === "string"),
  );

  return entries.map((entry) => ({
    ...entry,
    user_email: entry.user_id ? (emailMap.get(entry.user_id) ?? null) : null,
  })) as RecentActivityEntry[];
}

export async function fetchRecentAIGenerations(agencyId: string, limit = 5) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("ai_generations")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  assertNoDbError(error, "Failed to fetch recent AI generations");

  const generations = (data ?? []) as AIGeneration[];
  const clientIds = Array.from(
    new Set(
      generations
        .map((generation) => generation.client_id)
        .filter((clientId): clientId is string => typeof clientId === "string"),
    ),
  );
  const campaignIds = Array.from(
    new Set(
      generations
        .map((generation) => generation.campaign_id)
        .filter((campaignId): campaignId is string => typeof campaignId === "string"),
    ),
  );

  const [{ data: clients, error: clientError }, { data: campaigns, error: campaignError }] =
    await Promise.all([
      clientIds.length > 0
        ? supabase.from("clients").select("id, name").in("id", clientIds)
        : Promise.resolve({ data: [], error: null }),
      campaignIds.length > 0
        ? supabase.from("campaigns").select("id, title").in("id", campaignIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  assertNoDbError(clientError, "Failed to fetch AI generation clients");
  assertNoDbError(campaignError, "Failed to fetch AI generation campaigns");

  const clientMap = new Map((clients ?? []).map((client) => [client.id, client.name] as const));
  const campaignMap = new Map(
    (campaigns ?? []).map((campaign) => [campaign.id, campaign.title] as const),
  );

  return generations.map((generation) => ({
    ...generation,
    campaign_title: generation.campaign_id ? (campaignMap.get(generation.campaign_id) ?? null) : null,
    client_name: generation.client_id ? (clientMap.get(generation.client_id) ?? null) : null,
  })) as RecentAIGeneration[];
}

export async function fetchRecentAssets(agencyId: string, limit = 5) {
  const assets = await fetchAssets({
    agencyId,
  });

  return assets.slice(0, limit);
}

export async function fetchDashboardSnapshot(agencyId: string): Promise<DashboardSnapshot> {
  const [
    metrics,
    recentCampaigns,
    upcomingContent,
    pendingReviews,
    recentAssets,
    recentAIGenerations,
    recentActivity,
  ] = await Promise.all([
    fetchDashboardMetrics(agencyId),
    fetchRecentCampaigns(agencyId),
    fetchUpcomingContent(agencyId),
    fetchPendingReviewContent(agencyId),
    fetchRecentAssets(agencyId),
    fetchRecentAIGenerations(agencyId),
    fetchRecentActivity(agencyId),
  ]);

  return {
    metrics,
    pendingReviews,
    recentActivity,
    recentAIGenerations,
    recentAssets,
    recentCampaigns,
    upcomingContent,
  };
}
