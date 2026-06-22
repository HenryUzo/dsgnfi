import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchClientWithBrandProfile } from "@/lib/db/clients";

type EditClientPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
  const [{ clientId }, membership] = await Promise.all([
    params,
    fetchCurrentAgencyMembership(),
  ]);

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Edit Client"
          title="No agency membership found"
          description="Add your authenticated user to agency_members before editing clients."
        />
        <Button asChild variant="outline">
          <Link href="/clients">Return to clients</Link>
        </Button>
      </div>
    );
  }

  const detail = await fetchClientWithBrandProfile(membership.agency_id, clientId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          eyebrow="Edit Client"
          title={`Update ${detail.client.name}`}
          description="Refine the core client record, then return to the detail workspace for brand profile editing."
        />
        <Button asChild variant="outline">
          <Link href={`/clients/${clientId}`}>Back to client</Link>
        </Button>
      </div>
      <ClientForm
        client={detail.client}
        description="Updates are saved directly to Supabase inside the current agency scope."
        title="Client details"
      />
    </div>
  );
}
