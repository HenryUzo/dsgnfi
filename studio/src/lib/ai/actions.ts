"use server";

import type { Json } from "@/types/database";
import { revalidatePath } from "next/cache";

import {
  buildCampaignGenerationPromptInput,
  generateCampaignStrategyAndCalendar,
  getGenerationSummaryText,
} from "@/lib/ai/campaign-generation";
import {
  buildContentDraftPromptInput,
  generateContentDraft,
} from "@/lib/ai/content-generation";
import {
  CAMPAIGN_STRATEGY_GENERATION_TYPE,
  CONTENT_ITEM_DRAFT_GENERATION_TYPE,
  initialCampaignGenerationActionState,
  type CampaignGenerationActionState,
  type CampaignGenerationPromptInput,
  type ContentDraftPromptInput,
} from "@/lib/ai/types";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createAIGenerationRecord } from "@/lib/db/ai-generations";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import {
  fetchCampaignGenerationContext,
  updateCampaignStatus,
} from "@/lib/db/campaigns";
import {
  createContentItems,
  createContentVariant,
  fetchContentGenerationContext,
  fetchContentItemById,
  fetchContentItems,
  fetchLatestContentVariantForItem,
  updateContentItem,
} from "@/lib/db/content-items";
import { createDbClient } from "@/lib/db/shared";
import { getActionErrorMessage, PublicError } from "@/lib/errors";

async function logActivity(params: {
  action: string;
  agencyId: string;
  entityId?: string | null;
  entityType: string;
  metadata?: { [key: string]: Json | undefined };
  userId: string;
}) {
  try {
    const supabase = await createDbClient();

    await supabase.from("activity_logs").insert({
      action: params.action,
      agency_id: params.agencyId,
      entity_id: params.entityId ?? null,
      entity_type: params.entityType,
      metadata: params.metadata ?? {},
      user_id: params.userId,
    });
  } catch {
    // TODO: promote AI activity log failures into dedicated monitoring when observability is added.
  }
}

async function saveFailedGenerationRecord(params: {
  agencyId: string;
  campaignId?: string | null;
  clientId: string;
  errorMessage: string;
  generationType: string;
  modelUsed?: string | null;
  promptInput:
    | CampaignGenerationPromptInput
    | ContentDraftPromptInput
    | Record<string, never>;
}) {
  try {
    await createAIGenerationRecord({
      agency_id: params.agencyId,
      ai_output: {},
      campaign_id: params.campaignId ?? null,
      client_id: params.clientId,
      error_message: params.errorMessage,
      generation_type: params.generationType,
      model_used: params.modelUsed ?? null,
      prompt_input: params.promptInput,
      status: "failed",
    });
  } catch {
    // Ignore failure record write errors so the action can still report the original problem.
  }
}

export async function generateCampaignStrategyAction(
  previousState: CampaignGenerationActionState = initialCampaignGenerationActionState,
  formData: FormData,
): Promise<CampaignGenerationActionState> {
  void previousState;

  const campaignId = String(formData.get("campaignId") ?? "");

  if (!campaignId) {
    return {
      message: "Campaign ID is missing.",
      status: "error",
    };
  }

  const [membership, user] = await Promise.all([
    fetchCurrentAgencyMembership(),
    requireAuthenticatedUser(),
  ]);

  if (!membership) {
    return {
      message:
        "No active agency membership was found for this user. Add your auth user ID to agency_members before generating strategy.",
      status: "error",
    };
  }

  const campaignContext = await fetchCampaignGenerationContext(
    membership.agency_id,
    campaignId,
  );

  if (!campaignContext) {
    return {
      message: "Campaign context could not be loaded for this agency scope.",
      status: "error",
    };
  }

  const promptInput = buildCampaignGenerationPromptInput(campaignContext);

  try {
    const result = await generateCampaignStrategyAndCalendar(promptInput);
    const generation = await createAIGenerationRecord({
      agency_id: membership.agency_id,
      ai_output: result.output,
      campaign_id: campaignId,
      client_id: campaignContext.client.id,
      generation_type: CAMPAIGN_STRATEGY_GENERATION_TYPE,
      model_used: result.modelUsed,
      prompt_input: promptInput,
      status: "success",
    });

    const savedContentItems = await createContentItems(
      result.output.calendar_items.map((item) => ({
        agency_id: membership.agency_id,
        campaign_id: campaignId,
        client_id: campaignContext.client.id,
        content_type: item.content_type,
        cta: item.cta,
        hashtags: item.hashtags,
        hook: item.hook,
        metadata: {
          caption_or_script_summary: item.caption_or_script_summary,
          generated_from_ai_generation_id: generation.id,
        },
        objective: item.objective,
        platform: item.platform,
        status: "draft",
        suggested_date: item.suggested_date,
        title: item.title,
      })),
    );

    await updateCampaignStatus(
      membership.agency_id,
      campaignId,
      "content_generated",
    );

    await Promise.all([
      logActivity({
        action: "campaign_strategy_generated",
        agencyId: membership.agency_id,
        entityId: campaignId,
        entityType: "campaign",
        metadata: {
          ai_generation_id: generation.id,
          item_count: savedContentItems.length,
        },
        userId: user.id,
      }),
      logActivity({
        action: "content_calendar_generated",
        agencyId: membership.agency_id,
        entityId: campaignId,
        entityType: "campaign",
        metadata: {
          ai_generation_id: generation.id,
          item_count: savedContentItems.length,
        },
        userId: user.id,
      }),
    ]);

    revalidatePath("/campaigns");
    revalidatePath("/content-calendar");
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/clients/${campaignContext.client.id}`);

    return {
      message: getGenerationSummaryText({
        generation,
        modelUsed: result.modelUsed,
        output: result.output,
        savedContentItems,
      }),
      status: "success",
    };
  } catch (error) {
    const message = getActionErrorMessage(
      error,
      "Strategy and calendar generation failed. Try again after confirming the campaign context and OpenAI configuration.",
    );

    await saveFailedGenerationRecord({
      agencyId: membership.agency_id,
      campaignId,
      clientId: campaignContext.client.id,
      errorMessage: message,
      generationType: CAMPAIGN_STRATEGY_GENERATION_TYPE,
      promptInput,
    });

    return {
      message,
      status: "error",
    };
  }
}

export async function fetchCampaignDuplicateGenerationStatus(params: {
  agencyId: string;
  campaignId: string;
}) {
  const items = await fetchContentItems({
    agencyId: params.agencyId,
    campaignId: params.campaignId,
  });

  return items.length > 0;
}

export async function generateContentDraftAction(
  previousState: CampaignGenerationActionState = initialCampaignGenerationActionState,
  formData: FormData,
): Promise<CampaignGenerationActionState> {
  void previousState;

  const contentItemId = String(formData.get("contentItemId") ?? "");

  if (!contentItemId) {
    return {
      message: "Content item ID is missing.",
      status: "error",
    };
  }

  const [membership, user] = await Promise.all([
    fetchCurrentAgencyMembership(),
    requireAuthenticatedUser(),
  ]);

  if (!membership) {
    return {
      message:
        "No active agency membership was found for this user. Add your auth user ID to agency_members before generating content drafts.",
      status: "error",
    };
  }

  const generationContext = await fetchContentGenerationContext(
    membership.agency_id,
    contentItemId,
  );

  if (!generationContext) {
    return {
      message: "Content generation context could not be loaded for this agency scope.",
      status: "error",
    };
  }

  const promptInput = buildContentDraftPromptInput(generationContext);

  try {
    const result = await generateContentDraft(promptInput);
    const generation = await createAIGenerationRecord({
      agency_id: membership.agency_id,
      ai_output: result.output,
      campaign_id: generationContext.content_item.campaign_id,
      client_id: generationContext.client.id,
      generation_type: CONTENT_ITEM_DRAFT_GENERATION_TYPE,
      model_used: result.modelUsed,
      prompt_input: promptInput,
      status: "success",
    });

    const latestVariant = await fetchLatestContentVariantForItem(
      membership.agency_id,
      contentItemId,
    );

    const savedVariant = await createContentVariant({
      agency_id: membership.agency_id,
      ai_generated_copy: result.output.main_copy,
      approval_status: "draft",
      content_item_id: contentItemId,
      created_by: user.id,
      creative_direction: result.output.creative_direction,
      edited_copy: result.output.main_copy,
      model_used: result.modelUsed,
      version_number: (latestVariant?.version_number ?? 0) + 1,
    });

    const contentItem = await fetchContentItemById(membership.agency_id, contentItemId);

    if (!contentItem) {
      throw new PublicError("Content item could not be reloaded after draft generation.");
    }

    const mergedMetadata =
      contentItem.metadata &&
      typeof contentItem.metadata === "object" &&
      !Array.isArray(contentItem.metadata)
        ? {
            ...(contentItem.metadata as Record<string, Json | undefined>),
            caption_or_script_summary: result.output.main_copy,
            draft_notes: result.output.notes,
            generated_from_ai_generation_id: generation.id,
          }
        : {
            caption_or_script_summary: result.output.main_copy,
            draft_notes: result.output.notes,
            generated_from_ai_generation_id: generation.id,
          };

    await updateContentItem(membership.agency_id, contentItemId, {
      cta: result.output.cta,
      hashtags: result.output.hashtags,
      hook: result.output.hook,
      metadata: mergedMetadata,
      title: result.output.title,
    });

    await logActivity({
      action: "content_draft_generated",
      agencyId: membership.agency_id,
      entityId: contentItemId,
      entityType: "content_item",
      metadata: {
        ai_generation_id: generation.id,
        variant_id: savedVariant.id,
        version_number: savedVariant.version_number,
      },
      userId: user.id,
    });

    revalidatePath("/content-calendar");
    revalidatePath(`/content-calendar/${contentItemId}`);
    if (generationContext.content_item.campaign_id) {
      revalidatePath(`/campaigns/${generationContext.content_item.campaign_id}`);
    }
    revalidatePath(`/clients/${generationContext.client.id}`);

    return {
      message: "A full content draft was generated and saved as a new version.",
      status: "success",
    };
  } catch (error) {
    const message = getActionErrorMessage(
      error,
      "Content draft generation failed. Try again after confirming the content item context and OpenAI configuration.",
    );

    await saveFailedGenerationRecord({
      agencyId: membership.agency_id,
      campaignId: generationContext.content_item.campaign_id,
      clientId: generationContext.client.id,
      errorMessage: message,
      generationType: CONTENT_ITEM_DRAFT_GENERATION_TYPE,
      promptInput,
    });

    return {
      message,
      status: "error",
    };
  }
}
