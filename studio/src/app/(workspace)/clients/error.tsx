"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductionSafeErrorMessage } from "@/lib/errors";

export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">Clients could not load</CardTitle>
        <CardDescription className="leading-6">
          {getProductionSafeErrorMessage(
            error,
            "An unexpected error blocked the Clients module.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-3 p-0">
        <Button onClick={reset} type="button">
          Try again
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
