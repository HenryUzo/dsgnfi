import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-3xl">Page not found</CardTitle>
          <CardDescription className="leading-6">
            This route is outside the current MVP shell. Use the workspace navigation to return to an active section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
