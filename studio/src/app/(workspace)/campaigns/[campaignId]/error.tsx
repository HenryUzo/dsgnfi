"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductionSafeErrorMessage } from "@/lib/errors";

export default function CampaignDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">Campaign detail could not load</CardTitle>
        <CardDescription className="leading-6">
          {getProductionSafeErrorMessage(
            error,
            "An unexpected error blocked this campaign page.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-3 p-0">
        <Button onClick={reset} type="button">
          Try again
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/campaigns">Back to campaigns</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
