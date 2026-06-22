import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContentItemNotFound() {
  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">Content item not found</CardTitle>
        <CardDescription>
          This content item does not exist in the current agency scope.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Button asChild>
          <Link href="/content-calendar">Return to content calendar</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
