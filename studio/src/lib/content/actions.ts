"use server";

import type { Json } from "@/types/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import {
  createContentComment,
  createContentVariant,
  fetchContentItemById,
  fetchLatestContentVariantForItem,
  updateContentItem,
  updateContentVariant,
} from "@/lib/db/content-items";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { createDbClient } from "@/lib/db/shared";
import {
  initialContentCommentFormState,
  initialContentEditorFormState,
  initialContentStatusFormState,
  mapContentItemStatusToVariantApprovalStatus,
  type ContentCommentFormState,
  type ContentEditorFormState,
  type ContentEditorFormValues,
  type ContentStatusFormState,
} from "@/lib/content/types";
import { getActionErrorMessage, PublicError } from "@/lib/errors";

const editorSchema = z.object({
  ai_generated_copy: z.string().trim().optional(),
  creative_direction: z.string().trim().optional(),
  edited_copy: z.string().trim().min(1, "Final copy is required."),
  notes: z.string().trim().optional(),
});

const statusSchema = z.enum([
  "approved",
  "changes_requested",
  "draft",
  "needs_review",
  "published_manually",
  "ready_to_publish",
]);

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function buildEditorValues(formData: FormData): ContentEditorFormValues {
  return {
    ai_generated_copy: getStringValue(formData.get("ai_generated_copy")),
    creative_direction: getStringValue(formData.get("creative_direction")),
    edited_copy: getStringValue(formData.get("edited_copy")),
    notes: getStringValue(formData.get("notes")),
  };
}

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
    // TODO: move content workflow activity log failures into monitoring later.
  }
}

async function getContentActionContext(contentItemId: string) {
  const [membership, user] = await Promise.all([
    fetchCurrentAgencyMembership(),
    requireAuthenticatedUser(),
  ]);

  if (!membership) {
    throw new PublicError(
      "No active agency membership was found for this user. Add your auth user ID to agency_members before using the content workflow.",
    );
  }

  const contentItem = await fetchContentItemById(membership.agency_id, contentItemId);

  if (!contentItem) {
    throw new PublicError("Content item could not be found in the current agency scope.");
  }

  return { contentItem, membership, user };
}

function buildMergedMetadata(existing: Json, patch: Record<string, Json | undefined>) {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, Json | undefined>)
      : {};

  return {
    ...base,
    ...patch,
  };
}

export async function saveContentVariantAction(
  previousState: ContentEditorFormState = initialContentEditorFormState,
  formData: FormData,
): Promise<ContentEditorFormState> {
  void previousState;

  const contentItemId = getStringValue(formData.get("contentItemId"));
  const mode = getStringValue(formData.get("mode")) || "update_latest";
  const variantId = getStringValue(formData.get("variantId")) || null;
  const values = buildEditorValues(formData);

  if (!contentItemId) {
    return {
      message: "Content item ID is missing.",
      status: "error",
      values,
    };
  }

  const parsed = editorSchema.safeParse(values);

  if (!parsed.success) {
    return {
      errors: {
        edited_copy: parsed.error.flatten().fieldErrors.edited_copy?.[0],
      },
      message: "Fix the highlighted content fields and try again.",
      status: "error",
      values,
    };
  }

  try {
    const { contentItem, membership, user } = await getContentActionContext(contentItemId);
    const latestVariant = await fetchLatestContentVariantForItem(
      membership.agency_id,
      contentItemId,
    );

    let savedVariant;

    if (mode === "create_new" || !latestVariant || !variantId) {
      savedVariant = await createContentVariant({
        agency_id: membership.agency_id,
        ai_generated_copy: parsed.data.ai_generated_copy || null,
        approval_status: latestVariant?.approval_status ?? "draft",
        content_item_id: contentItemId,
        created_by: user.id,
        creative_direction: parsed.data.creative_direction || null,
        edited_copy: parsed.data.edited_copy,
        model_used: latestVariant?.model_used ?? null,
        version_number: (latestVariant?.version_number ?? 0) + 1,
      });
    } else {
      savedVariant = await updateContentVariant(membership.agency_id, variantId, {
        ai_generated_copy: parsed.data.ai_generated_copy || null,
        creative_direction: parsed.data.creative_direction || null,
        edited_copy: parsed.data.edited_copy,
      });
    }

    await updateContentItem(membership.agency_id, contentItemId, {
      metadata: buildMergedMetadata(contentItem.metadata, {
        editor_notes: parsed.data.notes || null,
      }),
    });

    await logActivity({
      action: "content_variant_saved",
      agencyId: membership.agency_id,
      entityId: contentItemId,
      entityType: "content_item",
      metadata: {
        mode,
        variant_id: savedVariant.id,
        version_number: savedVariant.version_number,
      },
      userId: user.id,
    });

    revalidatePath("/content-calendar");
    revalidatePath(`/content-calendar/${contentItemId}`);
    if (contentItem.campaign_id) {
      revalidatePath(`/campaigns/${contentItem.campaign_id}`);
    }
    revalidatePath(`/clients/${contentItem.client_id}`);

    return {
      message:
        mode === "create_new"
          ? "A new content version was created."
          : "Content version saved.",
      status: "success",
      values,
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Content version could not be saved. Try again."),
      status: "error",
      values,
    };
  }
}

export async function addContentCommentAction(
  previousState: ContentCommentFormState = initialContentCommentFormState,
  formData: FormData,
): Promise<ContentCommentFormState> {
  void previousState;

  const contentItemId = getStringValue(formData.get("contentItemId"));
  const comment = getStringValue(formData.get("comment"));

  if (!contentItemId) {
    return {
      message: "Content item ID is missing.",
      status: "error",
      values: { comment },
    };
  }

  if (comment.trim().length === 0) {
    return {
      message: "Comment text is required.",
      status: "error",
      values: { comment },
    };
  }

  try {
    const { contentItem, membership, user } = await getContentActionContext(contentItemId);

    await createContentComment({
      agency_id: membership.agency_id,
      comment,
      content_item_id: contentItemId,
      user_id: user.id,
    });

    await logActivity({
      action: "content_comment_added",
      agencyId: membership.agency_id,
      entityId: contentItemId,
      entityType: "content_item",
      metadata: { content_length: comment.length },
      userId: user.id,
    });

    revalidatePath(`/content-calendar/${contentItemId}`);
    if (contentItem.campaign_id) {
      revalidatePath(`/campaigns/${contentItem.campaign_id}`);
    }

    return {
      message: "Comment added.",
      status: "success",
      values: { comment: "" },
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Comment could not be added. Try again."),
      status: "error",
      values: { comment },
    };
  }
}

export async function updateContentStatusAction(
  previousState: ContentStatusFormState = initialContentStatusFormState,
  formData: FormData,
): Promise<ContentStatusFormState> {
  void previousState;

  const contentItemId = getStringValue(formData.get("contentItemId"));
  const comment = getStringValue(formData.get("comment"));
  const parsedStatus = statusSchema.safeParse(getStringValue(formData.get("status")));

  if (!contentItemId) {
    return {
      message: "Content item ID is missing.",
      status: "error",
    };
  }

  if (!parsedStatus.success) {
    return {
      message: "A valid content status is required.",
      status: "error",
    };
  }

  if (parsedStatus.data === "changes_requested" && comment.trim().length === 0) {
    return {
      message: "Add a comment before requesting changes.",
      status: "error",
    };
  }

  try {
    const { contentItem, membership, user } = await getContentActionContext(contentItemId);
    const latestVariant = await fetchLatestContentVariantForItem(
      membership.agency_id,
      contentItemId,
    );

    await updateContentItem(membership.agency_id, contentItemId, {
      status: parsedStatus.data,
    });

    const mappedApprovalStatus = mapContentItemStatusToVariantApprovalStatus(parsedStatus.data);

    if (latestVariant && mappedApprovalStatus) {
      await updateContentVariant(membership.agency_id, latestVariant.id, {
        approval_status: mappedApprovalStatus,
      });
    }

    if (comment.trim().length > 0) {
      await createContentComment({
        agency_id: membership.agency_id,
        comment,
        content_item_id: contentItemId,
        user_id: user.id,
      });
    }

    await logActivity({
      action: "content_status_changed",
      agencyId: membership.agency_id,
      entityId: contentItemId,
      entityType: "content_item",
      metadata: {
        status: parsedStatus.data,
        variant_id: latestVariant?.id,
      },
      userId: user.id,
    });

    revalidatePath("/content-calendar");
    revalidatePath(`/content-calendar/${contentItemId}`);
    if (contentItem.campaign_id) {
      revalidatePath(`/campaigns/${contentItem.campaign_id}`);
    }
    revalidatePath(`/clients/${contentItem.client_id}`);

    return {
      message: `Content status updated to ${parsedStatus.data.replace(/_/g, " ")}.`,
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Content status could not be updated. Try again."),
      status: "error",
    };
  }
}
