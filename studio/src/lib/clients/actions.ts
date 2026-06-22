"use server";

import type { Route } from "next";
import type { Json } from "@/types/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { createDbClient } from "@/lib/db/shared";
import { getActionErrorMessage, PublicError } from "@/lib/errors";
import type {
  BrandProfileFormState,
  ClientFormState,
  FAQEntry,
} from "@/lib/clients/types";
import {
  initialBrandProfileFormState,
  initialClientFormState,
} from "@/lib/clients/types";

const clientStatusSchema = z.enum(["active", "archived", "paused"]);

const clientSchema = z.object({
  contact_email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Enter a valid contact email.",
    }),
  contact_name: z.string().trim().optional(),
  description: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  location: z.string().trim().optional(),
  name: z.string().trim().min(1, "Client name is required."),
  status: clientStatusSchema,
  website: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().url().safeParse(value).success, {
      message: "Enter a valid website URL.",
    }),
});

const faqEntrySchema = z.object({
  answer: z.string().trim().min(1, "Each FAQ answer is required."),
  question: z.string().trim().min(1, "Each FAQ question is required."),
});

const brandProfileSchema = z.object({
  brand_summary: z.string().trim().optional(),
  common_objections: z.array(z.string().trim().min(1)).default([]),
  competitors: z.array(z.string().trim().min(1)).default([]),
  content_pillars: z.array(z.string().trim().min(1)).default([]),
  facebook_notes: z.string().trim().optional(),
  faqs: z.array(faqEntrySchema).default([]),
  gbp_notes: z.string().trim().optional(),
  instagram_notes: z.string().trim().optional(),
  offer_examples: z.array(z.string().trim().min(1)).default([]),
  preferred_ctas: z.array(z.string().trim().min(1)).default([]),
  services: z.array(z.string().trim().min(1)).default([]),
  target_audience: z.string().trim().optional(),
  tone_of_voice: z.string().trim().optional(),
  words_to_avoid: z.array(z.string().trim().min(1)).default([]),
  words_to_use: z.array(z.string().trim().min(1)).default([]),
});

function toOptionalString(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

function buildClientErrors(issues: z.ZodIssue[]) {
  return issues.reduce<ClientFormState["errors"]>((errors, issue) => {
    const field = issue.path[0];

    if (
      typeof field === "string" &&
      [
        "contact_email",
        "description",
        "industry",
        "location",
        "name",
        "status",
        "website",
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

function buildBrandProfileErrors(issues: z.ZodIssue[]) {
  return issues.reduce<BrandProfileFormState["errors"]>((errors, issue) => {
    const field = issue.path[0];

    if (
      typeof field === "string" &&
      [
        "common_objections",
        "competitors",
        "content_pillars",
        "faqs",
        "offer_examples",
        "preferred_ctas",
        "services",
        "words_to_avoid",
        "words_to_use",
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

async function getAgencyContext() {
  const [user, membership] = await Promise.all([
    requireAuthenticatedUser(),
    fetchCurrentAgencyMembership(),
  ]);

  if (!membership) {
    throw new PublicError(
      "No active agency membership was found for this user. Add your auth user ID to agency_members before using the Clients module.",
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
    // TODO: promote activity-log failures to a dedicated monitoring path when observability is added.
  }
}

export async function createClientAction(
  previousState: ClientFormState = initialClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  void previousState;
  let redirectPath: Route | null = null;

  const parsed = clientSchema.safeParse({
    contact_email: formData.get("contact_email"),
    contact_name: formData.get("contact_name"),
    description: formData.get("description"),
    industry: formData.get("industry"),
    location: formData.get("location"),
    name: formData.get("name"),
    status: formData.get("status"),
    website: formData.get("website"),
  });

  if (!parsed.success) {
    return {
      errors: buildClientErrors(parsed.error.issues),
      message: "Fix the highlighted fields and try again.",
      status: "error",
    };
  }

  try {
    const { membership, user } = await getAgencyContext();
    const supabase = await createDbClient();
    const { data, error } = await supabase
      .from("clients")
      .insert({
        agency_id: membership.agency_id,
        contact_email: toOptionalString(parsed.data.contact_email),
        contact_name: toOptionalString(parsed.data.contact_name),
        description: toOptionalString(parsed.data.description),
        industry: toOptionalString(parsed.data.industry),
        location: toOptionalString(parsed.data.location),
        name: parsed.data.name,
        status: parsed.data.status,
        website: toOptionalString(parsed.data.website),
      })
      .select("id, name")
      .single();

    if (error || !data) {
      return {
        message: "Client could not be created. Confirm agency membership and try again.",
        status: "error",
      };
    }

    await logActivity({
      action: "client.created",
      agencyId: membership.agency_id,
      entityId: data.id,
      entityType: "client",
      metadata: { name: data.name },
      userId: user.id,
    });

    revalidatePath("/clients");
    redirectPath = `/clients/${data.id}?notice=client_created` as Route;
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Client could not be created. Try again."),
      status: "error",
    };
  }

  if (redirectPath) {
    redirect(redirectPath);
  }

  return {
    message: "Client created successfully.",
    status: "success",
  };
}

export async function updateClientAction(
  previousState: ClientFormState = initialClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  void previousState;
  let redirectPath: Route | null = null;

  const clientId = String(formData.get("clientId") ?? "");
  const parsed = clientSchema.safeParse({
    contact_email: formData.get("contact_email"),
    contact_name: formData.get("contact_name"),
    description: formData.get("description"),
    industry: formData.get("industry"),
    location: formData.get("location"),
    name: formData.get("name"),
    status: formData.get("status"),
    website: formData.get("website"),
  });

  if (!clientId) {
    return {
      message: "Client ID is missing.",
      status: "error",
    };
  }

  if (!parsed.success) {
    return {
      errors: buildClientErrors(parsed.error.issues),
      message: "Fix the highlighted fields and try again.",
      status: "error",
    };
  }

  try {
    const { membership, user } = await getAgencyContext();
    const supabase = await createDbClient();
    const { data, error } = await supabase
      .from("clients")
      .update({
        contact_email: toOptionalString(parsed.data.contact_email),
        contact_name: toOptionalString(parsed.data.contact_name),
        description: toOptionalString(parsed.data.description),
        industry: toOptionalString(parsed.data.industry),
        location: toOptionalString(parsed.data.location),
        name: parsed.data.name,
        status: parsed.data.status,
        website: toOptionalString(parsed.data.website),
      })
      .eq("agency_id", membership.agency_id)
      .eq("id", clientId)
      .select("id, name")
      .single();

    if (error || !data) {
      return {
        message: "Client could not be updated. Confirm agency access and try again.",
        status: "error",
      };
    }

    await logActivity({
      action: "client.updated",
      agencyId: membership.agency_id,
      entityId: data.id,
      entityType: "client",
      metadata: { name: data.name },
      userId: user.id,
    });

    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);
    redirectPath = `/clients/${clientId}?notice=client_updated` as Route;
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Client could not be updated. Try again."),
      status: "error",
    };
  }

  if (redirectPath) {
    redirect(redirectPath);
  }

  return {
    message: "Client updated successfully.",
    status: "success",
  };
}

export async function upsertBrandProfileAction(
  previousState: BrandProfileFormState = initialBrandProfileFormState,
  formData: FormData,
): Promise<BrandProfileFormState> {
  void previousState;

  const clientId = String(formData.get("clientId") ?? "");

  if (!clientId) {
    return {
      message: "Client ID is missing.",
      status: "error",
    };
  }

  let rawFaqs: FAQEntry[] = [];
  let rawServices: string[] = [];
  let rawContentPillars: string[] = [];
  let rawCommonObjections: string[] = [];
  let rawPreferredCtas: string[] = [];
  let rawWordsToUse: string[] = [];
  let rawWordsToAvoid: string[] = [];
  let rawCompetitors: string[] = [];
  let rawOfferExamples: string[] = [];

  try {
    rawFaqs = parseJsonArrayInput<FAQEntry[]>(formData.get("faqs"), []);
    rawServices = parseJsonArrayInput<string[]>(formData.get("services"), []);
    rawContentPillars = parseJsonArrayInput<string[]>(
      formData.get("content_pillars"),
      [],
    );
    rawCommonObjections = parseJsonArrayInput<string[]>(
      formData.get("common_objections"),
      [],
    );
    rawPreferredCtas = parseJsonArrayInput<string[]>(
      formData.get("preferred_ctas"),
      [],
    );
    rawWordsToUse = parseJsonArrayInput<string[]>(formData.get("words_to_use"), []);
    rawWordsToAvoid = parseJsonArrayInput<string[]>(
      formData.get("words_to_avoid"),
      [],
    );
    rawCompetitors = parseJsonArrayInput<string[]>(
      formData.get("competitors"),
      [],
    );
    rawOfferExamples = parseJsonArrayInput<string[]>(
      formData.get("offer_examples"),
      [],
    );
  } catch {
    return {
      message: "One or more brand profile list fields could not be parsed.",
      status: "error",
    };
  }

  const parsed = brandProfileSchema.safeParse({
    brand_summary: formData.get("brand_summary"),
    common_objections: rawCommonObjections,
    competitors: rawCompetitors,
    content_pillars: rawContentPillars,
    facebook_notes: formData.get("facebook_notes"),
    faqs: rawFaqs,
    gbp_notes: formData.get("gbp_notes"),
    instagram_notes: formData.get("instagram_notes"),
    offer_examples: rawOfferExamples,
    preferred_ctas: rawPreferredCtas,
    services: rawServices,
    target_audience: formData.get("target_audience"),
    tone_of_voice: formData.get("tone_of_voice"),
    words_to_avoid: rawWordsToAvoid,
    words_to_use: rawWordsToUse,
  });

  if (!parsed.success) {
    return {
      errors: buildBrandProfileErrors(parsed.error.issues),
      message: "Fix the highlighted brand profile fields and try again.",
      status: "error",
    };
  }

  try {
    const { membership, user } = await getAgencyContext();
    const supabase = await createDbClient();

    const payload = {
      agency_id: membership.agency_id,
      brand_summary: toOptionalString(parsed.data.brand_summary),
      client_id: clientId,
      common_objections: parsed.data.common_objections,
      competitors: parsed.data.competitors,
      content_pillars: parsed.data.content_pillars,
      facebook_notes: toOptionalString(parsed.data.facebook_notes),
      faqs: parsed.data.faqs,
      gbp_notes: toOptionalString(parsed.data.gbp_notes),
      instagram_notes: toOptionalString(parsed.data.instagram_notes),
      offer_examples: parsed.data.offer_examples,
      preferred_ctas: parsed.data.preferred_ctas,
      services: parsed.data.services,
      target_audience: toOptionalString(parsed.data.target_audience),
      tone_of_voice: toOptionalString(parsed.data.tone_of_voice),
      words_to_avoid: parsed.data.words_to_avoid,
      words_to_use: parsed.data.words_to_use,
    };

    const { error } = await supabase
      .from("brand_profiles")
      .upsert(payload, { onConflict: "client_id" });

    if (error) {
      return {
        message: "Brand profile could not be saved. Confirm agency access and try again.",
        status: "error",
      };
    }

    await logActivity({
      action: "brand_profile.saved",
      agencyId: membership.agency_id,
      entityId: clientId,
      entityType: "client",
      metadata: { tab: "brand_profile" },
      userId: user.id,
    });

    revalidatePath(`/clients/${clientId}`);

    return {
      message: "Brand profile saved.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error, "Brand profile could not be saved. Try again."),
      status: "error",
    };
  }
}
