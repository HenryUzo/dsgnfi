import type { Agency } from "@/types/database";

import { assertNoDbError, createDbClient } from "@/lib/db/shared";

export type CurrentAgencyMembership = {
  agency: Agency;
  agency_id: string;
  role: string;
  status: string;
};

export async function fetchCurrentUserAgencies() {
  const supabase = await createDbClient();
  const { data, error } = await supabase
    .from("agency_members")
    .select("agency_id, role, status, agencies(*)")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  assertNoDbError(error, "Failed to fetch current user's agencies");

  return (data ?? [])
    .map((member) => ({
      agency: member.agencies as Agency | null,
      agency_id: member.agency_id,
      role: member.role,
      status: member.status,
    }))
    .filter((member) => member.agency !== null);
}

export async function fetchCurrentAgencyMembership(): Promise<CurrentAgencyMembership | null> {
  const agencies = await fetchCurrentUserAgencies();

  if (agencies.length === 0) {
    return null;
  }

  const currentAgency = agencies[0];

  return {
    agency: currentAgency.agency as Agency,
    agency_id: currentAgency.agency_id,
    role: currentAgency.role,
    status: currentAgency.status,
  };
}
