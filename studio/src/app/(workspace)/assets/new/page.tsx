import type { Route } from "next";
import Link from "next/link";

import { AssetForm } from "@/components/assets/asset-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchCampaignsForAgency } from "@/lib/db/campaigns";
import { fetchClientsForAgency } from "@/lib/db/clients";

type NewAssetPageProps = {
  searchParams: Promise<{
    campaignId?: string;
    clientId?: string;
    returnTo?: string;
  }>;
};

function getSafeReturnPath(value: string | undefined) {
  if (!value?.startsWith("/")) {
    return "/assets";
  }

  return value;
}

export default async function NewAssetPage({ searchParams }: NewAssetPageProps) {
  const [{ campaignId, clientId, returnTo }, membership] = await Promise.all([
    searchParams,
    fetchCurrentAgencyMembership(),
  ]);

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Upload Asset"
          title="An agency membership is required before uploading assets."
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <Button asChild variant="outline">
          <Link href="/assets">Return to assets</Link>
        </Button>
      </div>
    );
  }

  const [clients, campaigns] = await Promise.all([
    fetchClientsForAgency({
      agencyId: membership.agency_id,
      status: "all",
    }),
    fetchCampaignsForAgency({
      agencyId: membership.agency_id,
      status: "all",
    }),
  ]);
  const safeReturnTo = getSafeReturnPath(returnTo);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          eyebrow="Upload Asset"
          title="Add a new file to the agency library"
          description="Upload the source file first, then use metadata to keep it tied to the right client and campaign context."
        />
        <Button asChild variant="outline">
          <Link href={safeReturnTo as Route}>Back to assets</Link>
        </Button>
      </div>

      <AssetForm
        campaigns={campaigns}
        clients={clients}
        description="Uploads save the binary file to the private Supabase Storage bucket and create a scoped asset record in the current agency."
        preselectedCampaignId={campaignId}
        preselectedClientId={clientId}
        returnTo={safeReturnTo}
        title="Asset details"
      />
    </div>
  );
}
