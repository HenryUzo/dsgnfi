"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductionSafeErrorMessage } from "@/lib/errors";

export default function ContentItemError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">Content item failed to load</CardTitle>
        <CardDescription>
          {getProductionSafeErrorMessage(
            error,
            "There was a problem loading this content item workspace. Check agency access and the latest content data for this record.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3 p-0">
        <Button onClick={reset} type="button">
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
