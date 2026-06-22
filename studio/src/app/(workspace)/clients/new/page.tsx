import Link from "next/link";

import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";

export default async function NewClientPage() {
  const membership = await fetchCurrentAgencyMembership();

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Create Client"
          title="An agency membership is required before creating clients."
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <Button asChild variant="outline">
          <Link href="/clients">Return to clients</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          eyebrow="Create Client"
          title="Add a new client workspace"
          description="Capture the account basics first, then build the deeper brand profile on the client detail page."
        />
        <Button asChild variant="outline">
          <Link href="/clients">Back to clients</Link>
        </Button>
      </div>
      <ClientForm
        description="After save, the client will be associated with your current agency and opened in the detail workspace."
        title="Client details"
      />
    </div>
  );
}
