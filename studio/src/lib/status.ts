const statusLabels: Record<string, string> = {
  active: "Active",
  approved: "Approved",
  archived: "Archived",
  changes_requested: "Changes Requested",
  completed: "Completed",
  content_generated: "Content Generated",
  draft: "Draft",
  in_review: "In Review",
  needs_review: "Needs Review",
  paused: "Paused",
  planning: "Planning",
  published_manually: "Published Manually",
  ready_to_publish: "Ready to Publish",
};

export function formatStatusLabel(value: string) {
  return (
    statusLabels[value] ??
    value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

const activityLabels: Record<string, string> = {
  asset_deleted: "Deleted asset",
  asset_updated: "Updated asset metadata",
  asset_uploaded: "Uploaded asset",
  campaign_created: "Created campaign",
  campaign_strategy_generated: "Generated campaign strategy",
  campaign_updated: "Updated campaign",
  content_calendar_generated: "Generated content calendar",
  content_draft_generated: "Generated content draft",
  content_exported: "Exported content CSV",
  content_status_updated: "Updated content status",
  content_variant_saved: "Saved content version",
  content_comment_added: "Added content comment",
  client_created: "Created client",
  client_updated: "Updated client",
};

export function formatActivityActionLabel(value: string) {
  return activityLabels[value] ?? formatStatusLabel(value);
}
