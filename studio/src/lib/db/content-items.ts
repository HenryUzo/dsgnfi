import type {
  Agency,
  BrandProfile,
  Campaign,
  Client,
  ContentComment,
  ContentItem,
  ContentItemStatus,
  ContentVariant,
  Json,
  TableInsert,
  TableUpdate,
} from "@/types/database";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertNoDbError, createDbClient } from "@/lib/db/shared";

export type FetchContentItemsOptions = {
  agencyId: string;
  campaignId?: string;
  clientId?: string;
  contentType?: string;
  endDate?: string;
  platform?: string;
  search?: string;
  startDate?: string;
  status?: ContentItemStatus | "all";
};

export type ContentItemWithRelations = ContentItem & {
  campaign: {
    id: string;
    title: string;
  } | null;
  client: {
    id: string;
    name: string;
  } | null;
  latest_variant: ContentVariant | null;
};

export type ContentItemDetail = ContentItem & {
  campaign: Campaign | null;
  client: Client | null;
};

export type ContentCommentWithUserEmail = ContentComment & {
  user_email: string | null;
};

export async function fetchAuthUserEmails(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return new Map<string, string | null>();
  }

  const adminClient = getSupabaseAdminClient();
  const emailEntries = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      try {
        const { data, error } = await adminClient.auth.admin.getUserById(userId);

        if (error) {
          return [userId, null] as const;
        }

        return [userId, data.user.email ?? null] as const;
      } catch {
        return [userId, null] as const;
      }
    }),
  );

  return new Map(emailEntries);
}

export type ContentGenerationContext = {
  agency: Pick<Agency, "id" | "name" | "slug">;
  brand_profile: BrandProfile | null;
  campaign: Campaign | null;
  client: Client;
  content_item: ContentItem;
  latest_variant: ContentVariant | null;
};

function mergeLatestVariants(
  items: Array<Omit<ContentItemWithRelations, "latest_variant">>,
  variants: ContentVariant[],
) {
  const latestByItemId = new Map<string, ContentVariant>();

  for (const variant of variants) {
    const existing = latestByItemId.get(variant.content_item_id);

    if (!existing || variant.version_number > existing.version_number) {
      latestByItemId.set(variant.content_item_id, variant);
    }
  }

  return items.map((item) => ({
    ...item,
    latest_variant: latestByItemId.get(item.id) ?? null,
  }));
}

async function fetchLatestVariantsForContentItemIds(
  agencyId: string,
  contentItemIds: string[],
) {
  if (contentItemIds.length === 0) {
    return [] as ContentVariant[];
  }

  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("content_variants")
    .select("*")
    .eq("agency_id", agencyId)
    .in("content_item_id", contentItemIds)
    .order("version_number", { ascending: false })
    .order("created_at", { ascending: false });

  assertNoDbError(error, "Failed to fetch latest content variants");

  return (data ?? []) as ContentVariant[];
}

export async function fetchContentItems(options: FetchContentItemsOptions) {
  const supabase = await createDbClient();
  let query = supabase
    .from("content_items")
    .select("*, client:clients(id, name), campaign:campaigns(id, title)")
    .eq("agency_id", options.agencyId)
    .order("suggested_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (options.clientId) {
    query = query.eq("client_id", options.clientId);
  }

  if (options.campaignId) {
    query = query.eq("campaign_id", options.campaignId);
  }

  if (options.platform) {
    query = query.eq("platform", options.platform);
  }

  if (options.contentType) {
    query = query.eq("content_type", options.contentType);
  }

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options.startDate) {
    query = query.gte("suggested_date", options.startDate);
  }

  if (options.endDate) {
    query = query.lte("suggested_date", options.endDate);
  }

  if (options.search) {
    const sanitizedSearch = options.search.replace(/,/g, " ");
    query = query.or(
      `title.ilike.%${sanitizedSearch}%,objective.ilike.%${sanitizedSearch}%,hook.ilike.%${sanitizedSearch}%,cta.ilike.%${sanitizedSearch}%`,
    );
  }

  const { data, error } = await query;
  assertNoDbError(error, "Failed to fetch content items");

  const items = (data ?? []) as Array<Omit<ContentItemWithRelations, "latest_variant">>;
  const variants = await fetchLatestVariantsForContentItemIds(
    options.agencyId,
    items.map((item) => item.id),
  );

  return mergeLatestVariants(items, variants);
}

export async function fetchContentItemById(
  agencyId: string,
  contentItemId: string,
) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*, client:clients(*), campaign:campaigns(*)")
    .eq("agency_id", agencyId)
    .eq("id", contentItemId)
    .maybeSingle();

  assertNoDbError(error, "Failed to fetch content item");

  return (data ?? null) as ContentItemDetail | null;
}

export async function fetchContentVariantsForItem(
  agencyId: string,
  contentItemId: string,
) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("content_variants")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("content_item_id", contentItemId)
    .order("version_number", { ascending: false })
    .order("created_at", { ascending: false });

  assertNoDbError(error, "Failed to fetch content variants");

  return (data ?? []) as ContentVariant[];
}

export async function fetchLatestContentVariantForItem(
  agencyId: string,
  contentItemId: string,
) {
  const variants = await fetchContentVariantsForItem(agencyId, contentItemId);

  return variants[0] ?? null;
}

export async function fetchContentCommentsForItem(
  agencyId: string,
  contentItemId: string,
) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("content_comments")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("content_item_id", contentItemId)
    .order("created_at", { ascending: true });

  assertNoDbError(error, "Failed to fetch content comments");

  return (data ?? []) as ContentComment[];
}

export async function fetchContentCommentsWithUserEmails(
  agencyId: string,
  contentItemId: string,
) {
  const comments = await fetchContentCommentsForItem(agencyId, contentItemId);
  const userIds = Array.from(
    new Set(
      comments
        .map((comment) => comment.user_id)
        .filter((userId): userId is string => typeof userId === "string"),
    ),
  );

  if (userIds.length === 0) {
    return comments.map((comment) => ({
      ...comment,
      user_email: null,
    })) as ContentCommentWithUserEmail[];
  }

  const emailMap = await fetchAuthUserEmails(userIds);

  return comments.map((comment) => ({
    ...comment,
    user_email: comment.user_id ? (emailMap.get(comment.user_id) ?? null) : null,
  })) as ContentCommentWithUserEmail[];
}

export async function createContentItems(
  payload: Array<TableInsert<"content_items">>,
) {
  if (payload.length === 0) {
    return [] as ContentItem[];
  }

  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("content_items")
    .insert(payload)
    .select("*");

  assertNoDbError(error, "Failed to create content items");

  return (data ?? []) as ContentItem[];
}

export async function updateContentItem(
  agencyId: string,
  contentItemId: string,
  payload: {
    cta?: string | null;
    hashtags?: Json;
    hook?: string | null;
    metadata?: Json;
    objective?: string | null;
    status?: ContentItemStatus;
    suggested_date?: string | null;
    title?: string;
  },
) {
  const supabase = await createDbClient();
  const updatePayload: TableUpdate<"content_items"> = {};

  if ("cta" in payload) {
    updatePayload.cta = payload.cta;
  }

  if ("hashtags" in payload) {
    updatePayload.hashtags = payload.hashtags;
  }

  if ("hook" in payload) {
    updatePayload.hook = payload.hook;
  }

  if ("objective" in payload) {
    updatePayload.objective = payload.objective;
  }

  if ("status" in payload) {
    updatePayload.status = payload.status;
  }

  if ("suggested_date" in payload) {
    updatePayload.suggested_date = payload.suggested_date;
  }

  if ("title" in payload) {
    updatePayload.title = payload.title;
  }

  if ("metadata" in payload) {
    updatePayload.metadata = payload.metadata;
  }

  const { data, error } = await supabase
    .from("content_items")
    .update(updatePayload)
    .eq("agency_id", agencyId)
    .eq("id", contentItemId)
    .select("*")
    .single();

  assertNoDbError(error, "Failed to update content item");

  return data as ContentItem;
}

export async function createContentVariant(
  payload: TableInsert<"content_variants">,
) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("content_variants")
    .insert(payload)
    .select("*")
    .single();

  assertNoDbError(error, "Failed to create content variant");

  return data as ContentVariant;
}

export async function updateContentVariant(
  agencyId: string,
  variantId: string,
  payload: {
    ai_generated_copy?: string | null;
    approval_status?: ContentVariant["approval_status"];
    creative_direction?: string | null;
    edited_copy?: string | null;
  },
) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("content_variants")
    .update(payload)
    .eq("agency_id", agencyId)
    .eq("id", variantId)
    .select("*")
    .single();

  assertNoDbError(error, "Failed to update content variant");

  return data as ContentVariant;
}

export async function createContentComment(
  payload: TableInsert<"content_comments">,
) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("content_comments")
    .insert(payload)
    .select("*")
    .single();

  assertNoDbError(error, "Failed to create content comment");

  return data as ContentComment;
}

export async function fetchContentGenerationContext(
  agencyId: string,
  contentItemId: string,
): Promise<ContentGenerationContext | null> {
  const detail = await fetchContentItemById(agencyId, contentItemId);

  if (!detail?.client) {
    return null;
  }

  const supabase = await createDbClient();
  const [{ data: agency, error: agencyError }, { data: brandProfile, error: brandProfileError }, latestVariant] =
    await Promise.all([
      supabase
        .from("agencies")
        .select("id, name, slug")
        .eq("id", agencyId)
        .maybeSingle(),
      supabase
        .from("brand_profiles")
        .select("*")
        .eq("agency_id", agencyId)
        .eq("client_id", detail.client.id)
        .maybeSingle(),
      fetchLatestContentVariantForItem(agencyId, contentItemId),
    ]);

  assertNoDbError(agencyError, "Failed to fetch content generation agency context");
  assertNoDbError(
    brandProfileError,
    "Failed to fetch content generation brand profile context",
  );

  if (!agency) {
    return null;
  }

  return {
    agency: agency as Pick<Agency, "id" | "name" | "slug">,
    brand_profile: (brandProfile ?? null) as BrandProfile | null,
    campaign: detail.campaign,
    client: detail.client,
    content_item: {
      agency_id: detail.agency_id,
      campaign_id: detail.campaign_id,
      client_id: detail.client_id,
      content_type: detail.content_type,
      created_at: detail.created_at,
      cta: detail.cta,
      hashtags: detail.hashtags,
      hook: detail.hook,
      id: detail.id,
      metadata: detail.metadata,
      objective: detail.objective,
      platform: detail.platform,
      status: detail.status,
      suggested_date: detail.suggested_date,
      title: detail.title,
      updated_at: detail.updated_at,
    },
    latest_variant: latestVariant,
  };
}
