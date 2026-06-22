import { Badge } from "@/components/ui/badge";
import { formatStatusLabel } from "@/lib/status";
import type { CampaignStatus } from "@/types/database";

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  if (status === "approved" || status === "completed") {
    return <Badge variant="success">{formatStatusLabel(status)}</Badge>;
  }

  if (status === "in_review" || status === "content_generated") {
    return <Badge variant="warning">{formatStatusLabel(status)}</Badge>;
  }

  return <Badge variant="outline">{formatStatusLabel(status)}</Badge>;
}
