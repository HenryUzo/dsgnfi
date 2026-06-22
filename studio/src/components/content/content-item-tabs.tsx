import type { Route } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";

const tabs = [
  { label: "Editor", value: "editor" },
  { label: "Versions", value: "versions" },
  { label: "Comments", value: "comments" },
  { label: "Activity", value: "activity" },
] as const;

export function ContentItemTabs({
  contentItemId,
  currentTab,
}: {
  contentItemId: string;
  currentTab: string;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition",
              currentTab === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
            )}
            href={`/content-calendar/${contentItemId}?tab=${tab.value}` as Route}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
