import type {
  Asset,
  Campaign,
  Client,
  TableInsert,
  TableUpdate,
} from "@/types/database";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertNoDbError, createDbClient } from "@/lib/db/shared";
import {
  ASSET_STORAGE_BUCKET,
  classifyAssetType,
  type AssetTypeFilter,
  isAssetImage,
} from "@/lib/assets/types";

export type FetchAssetsOptions = {
  agencyId: string;
  campaignId?: string;
  clientId?: string;
  query?: string;
  type?: AssetTypeFilter;
};

export type AssetWithRelations = Asset & {
  campaign: Pick<Campaign, "id" | "title"> | null;
  client: Pick<Client, "id" | "name"> | null;
  download_url: string | null;
  is_image: boolean;
};

async function hydrateAssetRelations(assets: Asset[]) {
  const supabase = await createDbClient();
  const clientIds = Array.from(new Set(assets.map((asset) => asset.client_id)));
  const campaignIds = Array.from(
    new Set(
      assets
        .map((asset) => asset.campaign_id)
        .filter((campaignId): campaignId is string => typeof campaignId === "string"),
    ),
  );

  const [clientResult, campaignResult] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, name").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    campaignIds.length > 0
      ? supabase.from("campaigns").select("id, title").in("id", campaignIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  assertNoDbError(clientResult.error, "Failed to fetch asset clients");
  assertNoDbError(campaignResult.error, "Failed to fetch asset campaigns");

  const clientMap = new Map(
    (clientResult.data ?? []).map((client) => [client.id, client] as const),
  );
  const campaignMap = new Map(
    (campaignResult.data ?? []).map((campaign) => [campaign.id, campaign] as const),
  );

  return assets.map((asset) => ({
    ...asset,
    campaign: asset.campaign_id ? (campaignMap.get(asset.campaign_id) ?? null) : null,
    client: clientMap.get(asset.client_id) ?? null,
  }));
}

export async function createSignedAssetUrls(storagePaths: string[]) {
  const uniqueStoragePaths = Array.from(
    new Set(storagePaths.filter((path) => typeof path === "string" && path.length > 0)),
  );

  if (uniqueStoragePaths.length === 0) {
    return new Map<string, string | null>();
  }

  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient.storage
    .from(ASSET_STORAGE_BUCKET)
    .createSignedUrls(uniqueStoragePaths, 60 * 60);

  if (error) {
    return new Map(uniqueStoragePaths.map((path) => [path, null] as const));
  }

  return new Map(
    (data ?? []).map((entry) => [entry.path, entry.signedUrl ?? null] as const),
  );
}

export async function fetchAssets(options: FetchAssetsOptions) {
  const supabase = await createDbClient();
  let query = supabase
    .from("assets")
    .select("*")
    .eq("agency_id", options.agencyId)
    .order("created_at", { ascending: false });

  if (options.clientId) {
    query = query.eq("client_id", options.clientId);
  }

  if (options.campaignId) {
    query = query.eq("campaign_id", options.campaignId);
  }

  if (options.query) {
    const sanitizedSearch = options.query.replace(/,/g, " ");
    query = query.or(
      `name.ilike.%${sanitizedSearch}%,notes.ilike.%${sanitizedSearch}%`,
    );
  }

  const { data, error } = await query;
  assertNoDbError(error, "Failed to fetch assets");

  const typedData = (data ?? []) as Asset[];

  const filteredByType =
    options.type && options.type !== "all"
      ? typedData.filter((asset) => classifyAssetType(asset.type) === options.type)
      : typedData;
  const hydratedAssets = await hydrateAssetRelations(filteredByType);

  const signedUrlMap = await createSignedAssetUrls(
    hydratedAssets.map((asset) => asset.storage_path ?? ""),
  );

  return hydratedAssets.map((asset) => ({
    ...asset,
    download_url: asset.storage_path
      ? (signedUrlMap.get(asset.storage_path) ?? null)
      : asset.file_url,
    is_image: isAssetImage(asset.type),
  })) as AssetWithRelations[];
}

export async function fetchAssetsForClient(agencyId: string, clientId: string) {
  return fetchAssets({
    agencyId,
    clientId,
  });
}

export async function fetchAssetsForCampaign(agencyId: string, campaignId: string) {
  return fetchAssets({
    agencyId,
    campaignId,
  });
}

export async function fetchAssetById(agencyId: string, assetId: string) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("id", assetId)
    .maybeSingle();

  assertNoDbError(error, "Failed to fetch asset");

  if (!data) {
    return null;
  }

  const [hydratedAsset] = await hydrateAssetRelations([data as Asset]);
  const signedUrlMap = await createSignedAssetUrls([data.storage_path ?? ""]);

  return {
    ...hydratedAsset,
    download_url: data.storage_path
      ? (signedUrlMap.get(data.storage_path) ?? null)
      : data.file_url,
    is_image: isAssetImage(data.type),
  } as AssetWithRelations;
}

export async function createAssetRecord(payload: TableInsert<"assets">) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("assets")
    .insert(payload)
    .select("*")
    .single();

  assertNoDbError(error, "Failed to create asset record");

  return data as Asset;
}

export async function updateAssetRecord(
  agencyId: string,
  assetId: string,
  payload: TableUpdate<"assets">,
) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("assets")
    .update(payload)
    .eq("agency_id", agencyId)
    .eq("id", assetId)
    .select("*")
    .single();

  assertNoDbError(error, "Failed to update asset record");

  return data as Asset;
}

export async function deleteAssetRecord(agencyId: string, assetId: string) {
  const supabase = await createDbClient();
  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("agency_id", agencyId)
    .eq("id", assetId);

  assertNoDbError(error, "Failed to delete asset record");
}
