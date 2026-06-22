import { Badge } from "@/components/ui/badge";
import { formatStatusLabel } from "@/lib/status";
import type { ContentItemStatus } from "@/types/database";

const statusConfig: Record<ContentItemStatus, { className: string }> = {
  approved: {
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  changes_requested: {
    className: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  },
  draft: {
    className: "border-white/15 bg-white/5 text-foreground",
  },
  needs_review: {
    className: "border-sky-500/30 bg-sky-500/10 text-sky-100",
  },
  published_manually: {
    className: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100",
  },
  ready_to_publish: {
    className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-100",
  },
};

export function ContentStatusBadge({ status }: { status: ContentItemStatus }) {
  const config = statusConfig[status];

  return <Badge className={config.className}>{formatStatusLabel(status)}</Badge>;
}
