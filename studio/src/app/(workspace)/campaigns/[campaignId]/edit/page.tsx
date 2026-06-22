import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CampaignForm } from "@/components/campaigns/campaign-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchCampaignById } from "@/lib/db/campaigns";
import { fetchClientsForAgency } from "@/lib/db/clients";

type EditCampaignPageProps = {
  params: Promise<{ campaignId: string }>;
};

export default async function EditCampaignPage({
  params,
}: EditCampaignPageProps) {
  const [{ campaignId }, membership] = await Promise.all([
    params,
    fetchCurrentAgencyMembership(),
  ]);

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Edit Campaign"
          title="No agency membership found"
          description="Add your authenticated user to agency_members before editing campaigns."
        />
        <Button asChild variant="outline">
          <Link href="/campaigns">Return to campaigns</Link>
        </Button>
      </div>
    );
  }

  const [campaign, clients] = await Promise.all([
    fetchCampaignById(membership.agency_id, campaignId),
    fetchClientsForAgency({
      agencyId: membership.agency_id,
      status: "all",
    }),
  ]);

  if (!campaign) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          eyebrow="Edit Campaign"
          title={`Update ${campaign.title}`}
          description="Refine the campaign brief, then return to the detail workspace for deeper planning."
        />
        <Button asChild variant="outline">
          <Link href={`/campaigns/${campaignId}` as Route}>Back to campaign</Link>
        </Button>
      </div>
      <CampaignForm
        campaign={campaign}
        clients={clients}
        description="Updates are saved directly to Supabase inside the current agency scope."
        title="Campaign details"
      />
    </div>
  );
}
