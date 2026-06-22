import { Badge } from "@/components/ui/badge";
import { formatStatusLabel } from "@/lib/status";
import type { ClientStatus } from "@/types/database";

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  if (status === "active") {
    return <Badge variant="success">{formatStatusLabel(status)}</Badge>;
  }

  if (status === "paused") {
    return <Badge variant="warning">{formatStatusLabel(status)}</Badge>;
  }

  return <Badge variant="outline">{formatStatusLabel(status)}</Badge>;
}
