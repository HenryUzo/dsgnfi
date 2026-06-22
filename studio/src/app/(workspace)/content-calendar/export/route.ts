import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { createDbClient } from "@/lib/db/shared";
import { fetchContentItems } from "@/lib/db/content-items";

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser();
  const membership = await fetchCurrentAgencyMembership();

  if (!membership) {
    return NextResponse.json(
      { message: "No active agency membership found for this account. Add this user to agency_members or create an agency membership." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";
  const exportableStatuses =
    status && ["approved", "ready_to_publish", "published_manually"].includes(status)
      ? [status]
      : ["approved", "ready_to_publish", "published_manually"];

  const items = await fetchContentItems({
    agencyId: membership.agency_id,
    campaignId: searchParams.get("campaignId") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    contentType: searchParams.get("contentType") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    platform: searchParams.get("platform") || undefined,
    search: searchParams.get("query") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    status: "all",
  });

  const rows = items
    .filter((item) => exportableStatuses.includes(item.status))
    .map((item) => {
      const metadataSummary =
        item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
          ? (item.metadata as Record<string, unknown>).caption_or_script_summary
          : null;
      const finalCopy =
        item.latest_variant?.edited_copy ||
        item.latest_variant?.ai_generated_copy ||
        (typeof metadataSummary === "string" ? metadataSummary : "");
      const hashtags = Array.isArray(item.hashtags)
        ? item.hashtags.filter((tag): tag is string => typeof tag === "string").join(" ")
        : "";

      return [
        item.client?.name ?? "",
        item.campaign?.title ?? "",
        item.title,
        item.platform,
        item.content_type,
        item.suggested_date ?? "",
        item.status,
        item.hook ?? "",
        finalCopy,
        item.cta ?? "",
        hashtags,
      ];
    });

  const header = [
    "Client",
    "Campaign",
    "Title",
    "Platform",
    "Content Type",
    "Suggested Date",
    "Status",
    "Hook",
    "Final Copy",
    "CTA",
    "Hashtags",
  ];

  const csv = [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(String(value))).join(","))
    .join("\n");

  try {
    const supabase = await createDbClient();

    await supabase.from("activity_logs").insert({
      action: "content_exported",
      agency_id: membership.agency_id,
      entity_type: "content_export",
      metadata: {
        exported_count: rows.length,
        statuses: exportableStatuses,
      },
      user_id: user.id,
    });
  } catch {
    // TODO: export activity logging should move into dedicated monitoring later.
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="dsgnfi-content-export.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
