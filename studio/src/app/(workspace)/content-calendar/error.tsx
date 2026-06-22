"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductionSafeErrorMessage } from "@/lib/errors";

export default function ContentCalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">Content calendar failed to load</CardTitle>
        <CardDescription>
          {getProductionSafeErrorMessage(
            error,
            "There was a problem loading the content calendar workspace. Check Supabase access, agency membership, and export filters.",
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
