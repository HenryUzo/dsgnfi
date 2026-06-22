import { Badge } from "@/components/ui/badge";
import { formatStatusLabel } from "@/lib/status";
import type { ContentVariantApprovalStatus } from "@/types/database";

export function ContentApprovalStatusBadge({
  status,
}: {
  status: ContentVariantApprovalStatus;
}) {
  if (status === "approved") {
    return <Badge variant="success">{formatStatusLabel(status)}</Badge>;
  }

  if (status === "needs_review" || status === "changes_requested") {
    return <Badge variant="warning">{formatStatusLabel(status)}</Badge>;
  }

  return <Badge variant="outline">{formatStatusLabel(status)}</Badge>;
}
