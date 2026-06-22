import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  delta: string;
  description?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning";
};

export function MetricCard({
  label,
  value,
  delta,
  description,
  icon: Icon,
  tone = "default",
}: MetricCardProps) {
  return (
    <Card className="relative gap-4 overflow-hidden">
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-0">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            {label}
          </p>
          <CardTitle className="text-3xl font-semibold">{value}</CardTitle>
        </div>
        <Badge variant={tone}>
          {Icon ? <Icon className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
          {delta}
        </Badge>
      </CardHeader>
      <CardContent className="p-0 text-sm leading-6 text-muted-foreground">
        {description ?? "Focused on internal execution for the Content + Campaign MVP."}
      </CardContent>
    </Card>
  );
}
