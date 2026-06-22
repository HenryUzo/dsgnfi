import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientNotFound() {
  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">Client not found</CardTitle>
        <CardDescription className="leading-6">
          The client record could not be found in the current agency scope, or RLS is preventing access.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Button asChild>
          <Link href="/clients">Return to clients</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
