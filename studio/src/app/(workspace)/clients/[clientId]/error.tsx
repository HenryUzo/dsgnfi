"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductionSafeErrorMessage } from "@/lib/errors";

export default function ClientDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">Client detail could not load</CardTitle>
        <CardDescription className="leading-6">
          {getProductionSafeErrorMessage(
            error,
            "An unexpected error blocked this client page.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-3 p-0">
        <Button onClick={reset} type="button">
          Try again
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/clients">Back to clients</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
