import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction?: string;
};

export function EmptyState({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <Card className="relative overflow-hidden border-white/10 bg-[linear-gradient(145deg,rgba(10,18,36,0.96),rgba(8,12,24,0.94))]">
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <CardHeader className="gap-4">
        <Badge variant="outline">{eyebrow}</Badge>
        <div className="space-y-2">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-6">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gap-3 sm:flex sm:flex-row">
        <Button>{primaryAction}</Button>
        {secondaryAction ? (
          <Button variant="ghost" className="justify-between">
            {secondaryAction}
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
