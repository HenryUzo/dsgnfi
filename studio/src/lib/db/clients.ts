import type { BrandProfile, Client, ClientWithBrandProfile } from "@/types/database";

import { assertNoDbError, createDbClient } from "@/lib/db/shared";

type FetchClientsForAgencyOptions = {
  agencyId: string;
  search?: string;
  status?: "active" | "all" | "archived" | "paused";
};

export type ClientOverviewStats = {
  assetCount: number;
  campaignCount: number;
  contentItemCount: number;
};

export async function fetchClientsForAgency(options: FetchClientsForAgencyOptions) {
  const supabase = await createDbClient();
  let query = supabase
    .from("clients")
    .select("*")
    .eq("agency_id", options.agencyId)
    .order("created_at", { ascending: false });

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options.search) {
    const sanitizedSearch = options.search.replace(/,/g, " ");
    query = query.or(
      `name.ilike.%${sanitizedSearch}%,industry.ilike.%${sanitizedSearch}%,location.ilike.%${sanitizedSearch}%`,
    );
  }

  const { data, error } = await query;

  assertNoDbError(error, "Failed to fetch clients for agency");

  return (data ?? []) as Client[];
}

export async function fetchClientWithBrandProfile(
  agencyId: string,
  clientId: string,
): Promise<ClientWithBrandProfile | null> {
  const supabase = await createDbClient();

  const [{ data: client, error: clientError }, { data: brandProfile, error: brandError }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .eq("agency_id", agencyId)
        .eq("id", clientId)
        .maybeSingle(),
      supabase
        .from("brand_profiles")
        .select("*")
        .eq("agency_id", agencyId)
        .eq("client_id", clientId)
        .maybeSingle(),
    ]);

  assertNoDbError(clientError, "Failed to fetch client");
  assertNoDbError(brandError, "Failed to fetch brand profile");

  if (!client) {
    return null;
  }

  return {
    brand_profile: (brandProfile ?? null) as BrandProfile | null,
    client: client as Client,
  };
}

export async function fetchClientOverviewStats(
  agencyId: string,
  clientId: string,
): Promise<ClientOverviewStats> {
  const supabase = await createDbClient();
  const [campaigns, contentItems, assets] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("client_id", clientId),
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("client_id", clientId),
    supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("client_id", clientId),
  ]);

  assertNoDbError(campaigns.error, "Failed to fetch client campaign count");
  assertNoDbError(contentItems.error, "Failed to fetch client content count");
  assertNoDbError(assets.error, "Failed to fetch client asset count");

  return {
    assetCount: assets.count ?? 0,
    campaignCount: campaigns.count ?? 0,
    contentItemCount: contentItems.count ?? 0,
  };
}
