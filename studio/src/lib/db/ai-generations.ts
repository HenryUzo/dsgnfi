import type { AIGeneration, TableInsert } from "@/types/database";

import { assertNoDbError, createDbClient } from "@/lib/db/shared";

type FetchLatestAIGenerationOptions = {
  agencyId: string;
  campaignId: string;
  status?: "failed" | "success";
};

export async function fetchLatestAIGenerationForCampaign(
  options: FetchLatestAIGenerationOptions,
) {
  const supabase = await createDbClient();
  let query = supabase
    .from("ai_generations")
    .select("*")
    .eq("agency_id", options.agencyId)
    .eq("campaign_id", options.campaignId)
    .eq("generation_type", "campaign_strategy_calendar")
    .order("created_at", { ascending: false })
    .limit(1);

  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query.maybeSingle();
  assertNoDbError(error, "Failed to fetch latest AI generation");

  return (data ?? null) as AIGeneration | null;
}

export async function createAIGenerationRecord(
  payload: TableInsert<"ai_generations">,
) {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("ai_generations")
    .insert(payload)
    .select("*")
    .single();

  assertNoDbError(error, "Failed to create AI generation record");

  return data as AIGeneration;
}
