"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/app-config";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top,#142034,transparent_40%),linear-gradient(180deg,#060910,#0b1220)] text-foreground">
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
          <Card className="max-w-xl">
            <CardHeader className="p-0">
              <CardTitle className="text-3xl">Application error</CardTitle>
              <CardDescription className="leading-6">
                A production-safe error boundary stopped an unexpected failure inside {APP_NAME}. Refresh or return to the dashboard and try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 p-0">
              <Button onClick={reset} type="button">
                Try again
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/dashboard">Return to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </body>
    </html>
  );
}
