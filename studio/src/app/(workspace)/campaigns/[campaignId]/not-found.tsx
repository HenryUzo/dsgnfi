import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CampaignNotFound() {
  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">Campaign not found</CardTitle>
        <CardDescription className="leading-6">
          The campaign record could not be found in the current agency scope, or RLS is preventing access.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Button asChild>
          <Link href="/campaigns">Return to campaigns</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
