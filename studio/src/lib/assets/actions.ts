"use server";

import type { Json } from "@/types/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import {
  allowedAssetMimeTypes,
  ASSET_STORAGE_BUCKET,
  initialAssetDeleteState,
  initialAssetFormState,
  MAX_ASSET_FILE_SIZE_BYTES,
  parseAssetTags,
  type AssetDeleteState,
  type AssetFormState,
  type AssetFormValues,
} from "@/lib/assets/types";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchCampaignById } from "@/lib/db/campaigns";
import { fetchClientWithBrandProfile } from "@/lib/db/clients";
import {
  createAssetRecord,
  deleteAssetRecord,
  fetchAssetById,
  updateAssetRecord,
} from "@/lib/db/assets";
import { createDbClient } from "@/lib/db/shared";
import { getPublicEnv } from "@/lib/env";
import { getActionErrorMessage, PublicError } from "@/lib/errors";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const assetSchema = z.object({
  campaign_id: z.string().trim().optional(),
  client_id: z.string().trim().min(1, "Client is required."),
  name: z.string().trim().min(1, "Asset name is required."),
  notes: z.string().trim().optional(),
  tags: z.string().trim().optional(),
});

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function getSafeReturnPath(value: string) {
  if (!value.startsWith("/")) {
    return null;
  }

  return value;
}

function buildAssetValues(formData: FormData): AssetFormValues {
  return {
    campaign_id: getStringValue(formData.get("campaign_id")),
    client_id: getStringValue(formData.get("client_id")),
    name: getStringValue(formData.get("name")),
    notes: getStringValue(formData.get("notes")),
    tags: getStringValue(formData.get("tags")),
  };
}

function buildSafeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildStoragePath(params: {
  agencyId: string;
  campaignId?: string;
  clientId: string;
  fileName: string;
}) {
  const safeFileName = buildSafeFileName(params.fileName) || "asset";
  const timestamp = Date.now();
  const campaignSegment = params.campaignId && params.campaignId.length > 0 ? params.campaignId : "general";

  return `${params.agencyId}/${params.clientId}/${campaignSegment}/${timestamp}-${safeFileName}`;
}

function buildStorageFileUrl(storagePath: string) {
  const env = getPublicEnv();

  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/${ASSET_STORAGE_BUCKET}/${storagePath}`;
}

function appendNoticeToPath(path: string, notice: string) {
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}notice=${notice}`;
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
    // TODO: move asset activity log failures into dedicated monitoring later.
  }
}

async function getAssetActionContext() {
  const [membership, user] = await Promise.all([
    fetchCurrentAgencyMembership(),
    requireAuthenticatedUser(),
  ]);

  if (!membership) {
    throw new PublicError(
      "No active agency membership was found for this user. Add your auth user ID to agency_members before using the asset library.",
    );
  }

  return { membership, user };
}

async function validateClientAndCampaignScope(params: {
  agencyId: string;
  campaignId?: string;
  clientId: string;
}) {
  const client = await fetchClientWithBrandProfile(params.agencyId, params.clientId);

  if (!client) {
    throw new PublicError("The selected client is not available in the current agency scope.");
  }

  if (params.campaignId && params.campaignId.length > 0) {
    const campaign = await fetchCampaignById(params.agencyId, params.campaignId);

    if (!campaign) {
      throw new PublicError("The selected campaign is not available in the current agency scope.");
    }

    if (campaign.client?.id !== params.clientId) {
      throw new PublicError("The selected campaign does not belong to the selected client.");
    }
  }
}

function validateFile(file: File | null) {
  if (!file || file.size === 0) {
    return "File is required.";
  }

  if (!allowedAssetMimeTypes.includes(file.type as (typeof allowedAssetMimeTypes)[number])) {
    return "This file type is not allowed.";
  }

  if (file.size > MAX_ASSET_FILE_SIZE_BYTES) {
    return "File size must not exceed 10MB.";
  }

  return null;
}

export async function uploadAssetAction(
  previousState: AssetFormState = initialAssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  void previousState;

  const values = buildAssetValues(formData);
  const returnTo = getSafeReturnPath(getStringValue(formData.get("returnTo")));
  const fileEntry = formData.get("file");
  const file = fileEntry instanceof File ? fileEntry : null;
  const fileError = validateFile(file);

  const parsed = assetSchema.safeParse(values);

  if (!parsed.success || fileError) {
    return {
      errors: {
        client_id: parsed.success ? undefined : parsed.error.flatten().fieldErrors.client_id?.[0],
        file: fileError ?? undefined,
        name: parsed.success ? undefined : parsed.error.flatten().fieldErrors.name?.[0],
      },
      message: "Fix the highlighted asset fields and try again.",
      status: "error",
      values,
    };
  }

  try {
    const { membership, user } = await getAssetActionContext();
    const campaignId = parsed.data.campaign_id?.trim() ? parsed.data.campaign_id.trim() : null;

    await validateClientAndCampaignScope({
      agencyId: membership.agency_id,
      campaignId: campaignId ?? undefined,
      clientId: parsed.data.client_id,
    });

    const storagePath = buildStoragePath({
      agencyId: membership.agency_id,
      campaignId: campaignId ?? undefined,
      clientId: parsed.data.client_id,
      fileName: file!.name,
    });
    const storageClient = getSupabaseAdminClient().storage.from(ASSET_STORAGE_BUCKET);
    const fileBytes = new Uint8Array(await file!.arrayBuffer());
    const uploadResult = await storageClient.upload(storagePath, fileBytes, {
      contentType: file!.type,
      upsert: false,
    });

    if (uploadResult.error) {
      return {
        message:
          "Asset upload failed. Check the agency-assets bucket, storage policies, file type restrictions, and size limits.",
        status: "error",
        values,
      };
    }

    try {
      const asset = await createAssetRecord({
        agency_id: membership.agency_id,
        campaign_id: campaignId,
        client_id: parsed.data.client_id,
        file_url: buildStorageFileUrl(storagePath),
        name: parsed.data.name,
        notes: parsed.data.notes || null,
        storage_path: storagePath,
        tags: parseAssetTags(parsed.data.tags ?? ""),
        type: file!.type,
      });

      await logActivity({
        action: "asset_uploaded",
        agencyId: membership.agency_id,
        entityId: asset.id,
        entityType: "asset",
        metadata: {
          client_id: asset.client_id,
          campaign_id: asset.campaign_id,
          storage_path: asset.storage_path,
        },
        userId: user.id,
      });

      revalidatePath("/assets");
      revalidatePath(`/assets/${asset.id}`);
      revalidatePath(`/clients/${asset.client_id}`);
      if (asset.campaign_id) {
        revalidatePath(`/campaigns/${asset.campaign_id}`);
      }

      return {
        message: "Asset uploaded successfully.",
        redirectTo: `${appendNoticeToPath(`/assets/${asset.id}`, "asset_uploaded")}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`,
        status: "success",
        values: {
          campaign_id: campaignId ?? "",
          client_id: parsed.data.client_id,
          name: parsed.data.name,
          notes: parsed.data.notes ?? "",
          tags: parsed.data.tags ?? "",
        },
      };
    } catch (error) {
      await storageClient.remove([storagePath]);
      throw error;
    }
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Asset upload failed. Try again."),
      status: "error",
      values,
    };
  }
}

export async function updateAssetMetadataAction(
  previousState: AssetFormState = initialAssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  void previousState;

  const assetId = getStringValue(formData.get("assetId"));
  const values = buildAssetValues(formData);
  const returnTo = getSafeReturnPath(getStringValue(formData.get("returnTo")));

  if (!assetId) {
    return {
      message: "Asset ID is missing.",
      status: "error",
      values,
    };
  }

  const parsed = assetSchema.safeParse(values);

  if (!parsed.success) {
    return {
      errors: {
        client_id: parsed.error.flatten().fieldErrors.client_id?.[0],
        name: parsed.error.flatten().fieldErrors.name?.[0],
      },
      message: "Fix the highlighted asset fields and try again.",
      status: "error",
      values,
    };
  }

  try {
    const { membership, user } = await getAssetActionContext();
    const asset = await fetchAssetById(membership.agency_id, assetId);

    if (!asset) {
      throw new PublicError("Asset could not be found in the current agency scope.");
    }

    const campaignId = parsed.data.campaign_id?.trim() ? parsed.data.campaign_id.trim() : null;

    await validateClientAndCampaignScope({
      agencyId: membership.agency_id,
      campaignId: campaignId ?? undefined,
      clientId: parsed.data.client_id,
    });

    const updatedAsset = await updateAssetRecord(membership.agency_id, assetId, {
      campaign_id: campaignId,
      client_id: parsed.data.client_id,
      name: parsed.data.name,
      notes: parsed.data.notes || null,
      tags: parseAssetTags(parsed.data.tags ?? ""),
    });

    await logActivity({
      action: "asset_updated",
      agencyId: membership.agency_id,
      entityId: assetId,
      entityType: "asset",
      metadata: {
        client_id: updatedAsset.client_id,
        campaign_id: updatedAsset.campaign_id,
      },
      userId: user.id,
    });

    revalidatePath("/assets");
    revalidatePath(`/assets/${assetId}`);
    revalidatePath(`/clients/${asset.client_id}`);
    revalidatePath(`/clients/${updatedAsset.client_id}`);
    if (asset.campaign_id) {
      revalidatePath(`/campaigns/${asset.campaign_id}`);
    }
    if (updatedAsset.campaign_id) {
      revalidatePath(`/campaigns/${updatedAsset.campaign_id}`);
    }

    return {
      message: "Asset metadata updated.",
      redirectTo: `${appendNoticeToPath(`/assets/${assetId}`, "asset_updated")}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`,
      status: "success",
      values: {
        campaign_id: updatedAsset.campaign_id ?? "",
        client_id: updatedAsset.client_id,
        name: updatedAsset.name,
        notes: updatedAsset.notes ?? "",
        tags: parseAssetTags(values.tags).join(", "),
      },
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Asset metadata could not be updated. Try again."),
      status: "error",
      values,
    };
  }
}

export async function deleteAssetAction(
  previousState: AssetDeleteState = initialAssetDeleteState,
  formData: FormData,
): Promise<AssetDeleteState> {
  void previousState;

  const assetId = getStringValue(formData.get("assetId"));
  const returnTo = getSafeReturnPath(getStringValue(formData.get("returnTo")));

  if (!assetId) {
    return {
      message: "Asset ID is missing.",
      status: "error",
    };
  }

  try {
    const { membership, user } = await getAssetActionContext();
    const asset = await fetchAssetById(membership.agency_id, assetId);

    if (!asset) {
      throw new PublicError("Asset could not be found in the current agency scope.");
    }

    if (asset.storage_path) {
      const storageClient = getSupabaseAdminClient().storage.from(ASSET_STORAGE_BUCKET);
      const removalResult = await storageClient.remove([asset.storage_path]);

      if (removalResult.error) {
        throw new PublicError(
          "Asset deletion failed while removing the file from storage. Check the agency-assets bucket permissions and storage policies.",
        );
      }
    }

    await deleteAssetRecord(membership.agency_id, assetId);

    await logActivity({
      action: "asset_deleted",
      agencyId: membership.agency_id,
      entityId: assetId,
      entityType: "asset",
      metadata: {
        client_id: asset.client_id,
        campaign_id: asset.campaign_id,
        storage_path: asset.storage_path,
      },
      userId: user.id,
    });

    revalidatePath("/assets");
    revalidatePath(`/assets/${assetId}`);
    revalidatePath(`/clients/${asset.client_id}`);
    if (asset.campaign_id) {
      revalidatePath(`/campaigns/${asset.campaign_id}`);
    }

    const redirectTo = returnTo ? appendNoticeToPath(returnTo, "asset_deleted") : undefined;

    return {
      message: "Asset deleted.",
      redirectTo,
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Asset could not be deleted. Try again."),
      status: "error",
    };
  }
}
