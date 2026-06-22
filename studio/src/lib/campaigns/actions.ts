"use server";

import type { Route } from "next";
import type { Json } from "@/types/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchClientWithBrandProfile } from "@/lib/db/clients";
import { createDbClient } from "@/lib/db/shared";
import { getActionErrorMessage, PublicError } from "@/lib/errors";
import {
  campaignContentTypeOptions,
  campaignPlatformOptions,
  initialCampaignFormState,
  type CampaignFormValues,
  type CampaignFormState,
} from "@/lib/campaigns/types";

const campaignStatusSchema = z.enum([
  "approved",
  "completed",
  "content_generated",
  "draft",
  "in_review",
  "planning",
]);

const platformEnum = z.enum(campaignPlatformOptions);
const contentTypeEnum = z.enum(campaignContentTypeOptions);

const campaignSchema = z
  .object({
    client_id: z.string().trim().min(1, "Client is required."),
    content_types: z.array(contentTypeEnum).default([]),
    cta: z.string().trim().optional(),
    end_date: z.string().trim().optional(),
    internal_notes: z.string().trim().optional(),
    key_message: z.string().trim().optional(),
    number_of_posts: z.coerce
      .number()
      .int()
      .min(0, "Number of posts must be 0 or greater."),
    objective: z.string().trim().optional(),
    offer: z.string().trim().optional(),
    platforms: z.array(platformEnum).default([]),
    start_date: z.string().trim().optional(),
    status: campaignStatusSchema,
    target_audience: z.string().trim().optional(),
    title: z.string().trim().min(1, "Campaign title is required."),
    tone: z.string().trim().optional(),
    campaign_theme: z.string().trim().optional(),
  })
  .superRefine((data, context) => {
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);

      if (endDate < startDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date cannot be earlier than start date.",
          path: ["end_date"],
        });
      }
    }
  });

function toOptionalString(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

function toOptionalDate(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

function buildCampaignErrors(issues: z.ZodIssue[]) {
  return issues.reduce<CampaignFormState["errors"]>((errors, issue) => {
    const field = issue.path[0];

    if (
      typeof field === "string" &&
      [
        "client_id",
        "content_types",
        "end_date",
        "number_of_posts",
        "platforms",
        "start_date",
        "title",
      ].includes(field)
    ) {
      return {
        ...errors,
        [field]: issue.message,
      };
    }

    return errors;
  }, {});
}

function parseJsonArrayInput<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  return JSON.parse(value) as T;
}

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function buildCampaignValues(
  formData: FormData,
  rawPlatforms: string[],
  rawContentTypes: string[],
): CampaignFormValues {
  return {
    campaign_theme: getStringValue(formData.get("campaign_theme")),
    client_id: getStringValue(formData.get("client_id")),
    content_types: rawContentTypes,
    cta: getStringValue(formData.get("cta")),
    end_date: getStringValue(formData.get("end_date")),
    internal_notes: getStringValue(formData.get("internal_notes")),
    key_message: getStringValue(formData.get("key_message")),
    number_of_posts: getStringValue(formData.get("number_of_posts")),
    objective: getStringValue(formData.get("objective")),
    offer: getStringValue(formData.get("offer")),
    platforms: rawPlatforms,
    start_date: getStringValue(formData.get("start_date")),
    status:
      campaignStatusSchema.safeParse(getStringValue(formData.get("status"))).success
        ? (getStringValue(formData.get("status")) as CampaignFormValues["status"])
        : "draft",
    target_audience: getStringValue(formData.get("target_audience")),
    title: getStringValue(formData.get("title")),
    tone: getStringValue(formData.get("tone")),
  };
}

async function getAgencyContext() {
  const [user, membership] = await Promise.all([
    requireAuthenticatedUser(),
    fetchCurrentAgencyMembership(),
  ]);

  if (!membership) {
    throw new PublicError(
      "No active agency membership was found for this user. Add your auth user ID to agency_members before using the Campaigns module.",
    );
  }

  return { membership, user };
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
    // TODO: move activity log failures into dedicated monitoring when observability is introduced.
  }
}

async function validateClientOwnership(agencyId: string, clientId: string) {
  const client = await fetchClientWithBrandProfile(agencyId, clientId);

  if (!client) {
    throw new PublicError(
      "The selected client is not available in the current agency scope.",
    );
  }
}

export async function createCampaignAction(
  previousState: CampaignFormState = initialCampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  void previousState;
  let redirectPath: Route | null = null;
  let rawPlatforms: string[] = [];
  let rawContentTypes: string[] = [];

  try {
    rawPlatforms = parseJsonArrayInput<string[]>(formData.get("platforms"), []);
    rawContentTypes = parseJsonArrayInput<string[]>(
      formData.get("content_types"),
      [],
    );
  } catch {
    return {
      message: "Platforms or content types could not be parsed.",
      status: "error",
      values: buildCampaignValues(formData, rawPlatforms, rawContentTypes),
    };
  }

  const values = buildCampaignValues(formData, rawPlatforms, rawContentTypes);

  const parsed = campaignSchema.safeParse({
    campaign_theme: values.campaign_theme,
    client_id: values.client_id,
    content_types: rawContentTypes,
    cta: values.cta,
    end_date: values.end_date,
    internal_notes: values.internal_notes,
    key_message: values.key_message,
    number_of_posts: values.number_of_posts,
    objective: values.objective,
    offer: values.offer,
    platforms: rawPlatforms,
    start_date: values.start_date,
    status: values.status,
    target_audience: values.target_audience,
    title: values.title,
    tone: values.tone,
  });

  if (!parsed.success) {
    return {
      errors: buildCampaignErrors(parsed.error.issues),
      message: "Fix the highlighted campaign fields and try again.",
      status: "error",
      values,
    };
  }

  try {
    const { membership, user } = await getAgencyContext();
    await validateClientOwnership(membership.agency_id, parsed.data.client_id);

    const supabase = await createDbClient();
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        agency_id: membership.agency_id,
        campaign_theme: toOptionalString(parsed.data.campaign_theme),
        client_id: parsed.data.client_id,
        content_types: parsed.data.content_types,
        cta: toOptionalString(parsed.data.cta),
        end_date: toOptionalDate(parsed.data.end_date),
        internal_notes: toOptionalString(parsed.data.internal_notes),
        key_message: toOptionalString(parsed.data.key_message),
        number_of_posts: parsed.data.number_of_posts,
        objective: toOptionalString(parsed.data.objective),
        offer: toOptionalString(parsed.data.offer),
        platforms: parsed.data.platforms,
        start_date: toOptionalDate(parsed.data.start_date),
        status: parsed.data.status,
        target_audience: toOptionalString(parsed.data.target_audience),
        title: parsed.data.title,
        tone: toOptionalString(parsed.data.tone),
      })
      .select("id, title")
      .single();

    if (error || !data) {
      return {
        message: "Campaign could not be created. Confirm agency access and try again.",
        status: "error",
        values,
      };
    }

    await logActivity({
      action: "campaign.created",
      agencyId: membership.agency_id,
      entityId: data.id,
      entityType: "campaign",
      metadata: { title: data.title },
      userId: user.id,
    });

    revalidatePath("/campaigns");
    revalidatePath(`/clients/${parsed.data.client_id}`);
    redirectPath = `/campaigns/${data.id}?notice=campaign_created` as Route;
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Campaign could not be created. Try again."),
      status: "error",
      values,
    };
  }

  if (redirectPath) {
    redirect(redirectPath);
  }

  return {
    message: "Campaign created successfully.",
    status: "success",
  };
}

export async function updateCampaignAction(
  previousState: CampaignFormState = initialCampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  void previousState;
  let redirectPath: Route | null = null;
  const campaignId = String(formData.get("campaignId") ?? "");

  if (!campaignId) {
    return {
      message: "Campaign ID is missing.",
      status: "error",
    };
  }

  let rawPlatforms: string[] = [];
  let rawContentTypes: string[] = [];

  try {
    rawPlatforms = parseJsonArrayInput<string[]>(formData.get("platforms"), []);
    rawContentTypes = parseJsonArrayInput<string[]>(
      formData.get("content_types"),
      [],
    );
  } catch {
    return {
      message: "Platforms or content types could not be parsed.",
      status: "error",
      values: buildCampaignValues(formData, rawPlatforms, rawContentTypes),
    };
  }

  const values = buildCampaignValues(formData, rawPlatforms, rawContentTypes);

  const parsed = campaignSchema.safeParse({
    campaign_theme: values.campaign_theme,
    client_id: values.client_id,
    content_types: rawContentTypes,
    cta: values.cta,
    end_date: values.end_date,
    internal_notes: values.internal_notes,
    key_message: values.key_message,
    number_of_posts: values.number_of_posts,
    objective: values.objective,
    offer: values.offer,
    platforms: rawPlatforms,
    start_date: values.start_date,
    status: values.status,
    target_audience: values.target_audience,
    title: values.title,
    tone: values.tone,
  });

  if (!parsed.success) {
    return {
      errors: buildCampaignErrors(parsed.error.issues),
      message: "Fix the highlighted campaign fields and try again.",
      status: "error",
      values,
    };
  }

  try {
    const { membership, user } = await getAgencyContext();
    await validateClientOwnership(membership.agency_id, parsed.data.client_id);

    const supabase = await createDbClient();
    const { data, error } = await supabase
      .from("campaigns")
      .update({
        campaign_theme: toOptionalString(parsed.data.campaign_theme),
        client_id: parsed.data.client_id,
        content_types: parsed.data.content_types,
        cta: toOptionalString(parsed.data.cta),
        end_date: toOptionalDate(parsed.data.end_date),
        internal_notes: toOptionalString(parsed.data.internal_notes),
        key_message: toOptionalString(parsed.data.key_message),
        number_of_posts: parsed.data.number_of_posts,
        objective: toOptionalString(parsed.data.objective),
        offer: toOptionalString(parsed.data.offer),
        platforms: parsed.data.platforms,
        start_date: toOptionalDate(parsed.data.start_date),
        status: parsed.data.status,
        target_audience: toOptionalString(parsed.data.target_audience),
        title: parsed.data.title,
        tone: toOptionalString(parsed.data.tone),
      })
      .eq("agency_id", membership.agency_id)
      .eq("id", campaignId)
      .select("id, title")
      .single();

    if (error || !data) {
      return {
        message: "Campaign could not be updated. Confirm agency access and try again.",
        status: "error",
        values,
      };
    }

    await logActivity({
      action: "campaign.updated",
      agencyId: membership.agency_id,
      entityId: data.id,
      entityType: "campaign",
      metadata: { title: data.title },
      userId: user.id,
    });

    revalidatePath("/campaigns");
    revalidatePath(`/clients/${parsed.data.client_id}`);
    revalidatePath(`/campaigns/${campaignId}`);
    redirectPath = `/campaigns/${campaignId}?notice=campaign_updated` as Route;
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Campaign could not be updated. Try again."),
      status: "error",
      values,
    };
  }

  if (redirectPath) {
    redirect(redirectPath);
  }

  return {
    message: "Campaign updated successfully.",
    status: "success",
  };
}
