import type { Route } from "next";
import Link from "next/link";

import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RouteEmptyState({
  description,
  eyebrow,
  href,
  primaryLabel,
  secondaryLabel,
  title,
}: {
  description: string;
  eyebrow: string;
  href: Route;
  primaryLabel?: string;
  secondaryLabel?: string;
  title: string;
}) {
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
        <Button asChild>
          <Link href={href}>{primaryLabel ?? "Return to client overview"}</Link>
        </Button>
        {secondaryLabel ? (
          <Button asChild className="justify-between" variant="ghost">
            <Link href={`${href}?tab=brand-profile` as Route}>
              {secondaryLabel}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
