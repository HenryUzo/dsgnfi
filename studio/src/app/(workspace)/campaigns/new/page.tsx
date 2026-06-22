import Link from "next/link";

import { CampaignForm } from "@/components/campaigns/campaign-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchClientsForAgency } from "@/lib/db/clients";

type NewCampaignPageProps = {
  searchParams: Promise<{ clientId?: string }>;
};

export default async function NewCampaignPage({
  searchParams,
}: NewCampaignPageProps) {
  const [{ clientId }, membership] = await Promise.all([
    searchParams,
    fetchCurrentAgencyMembership(),
  ]);

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Create Campaign"
          title="An agency membership is required before creating campaigns."
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <Button asChild variant="outline">
          <Link href="/campaigns">Return to campaigns</Link>
        </Button>
      </div>
    );
  }

  const clients = await fetchClientsForAgency({
    agencyId: membership.agency_id,
    status: "all",
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          eyebrow="Create Campaign"
          title="Build the campaign brief"
          description="Create the core planning record first, then return to the campaign detail page for strategy and execution context."
        />
        <Button asChild variant="outline">
          <Link href="/campaigns">Back to campaigns</Link>
        </Button>
      </div>
      <CampaignForm
        clients={clients}
        description="After save, the campaign will be associated with your current agency and opened in the campaign detail workspace."
        preselectedClientId={clientId}
        title="Campaign details"
      />
    </div>
  );
}
