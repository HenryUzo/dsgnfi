import Link from "next/link";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { RouteEmptyState } from "@/components/clients/route-empty-state";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { formatDateLabel } from "@/components/clients/date-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { fetchClientsForAgency } from "@/lib/db/clients";

type ClientsPageProps = {
  searchParams: Promise<{
    query?: string;
    status?: "active" | "all" | "archived" | "paused";
  }>;
};

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Archived", value: "archived" },
] as const;

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const [{ query = "", status = "all" }, membership] = await Promise.all([
    searchParams,
    fetchCurrentAgencyMembership(),
  ]);

  if (!membership) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Client Workspace"
          title="No active agency membership found"
          description="No active agency membership found for this account. Add this user to agency_members or create an agency membership."
        />
        <RouteEmptyState
          description="Client workspaces remain hidden until the signed-in user belongs to the current agency. Once membership exists, create your first client workspace and complete the brand profile so AI can write in the client’s voice."
          eyebrow="Membership required"
          href="/dashboard"
          primaryLabel="Return to dashboard"
          secondaryLabel="Open brand profile tab once access exists"
          title="No agency data is accessible yet"
        />
      </div>
    );
  }

  const clients = await fetchClientsForAgency({
    agencyId: membership.agency_id,
    search: query,
    status,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Client Workspace"
          title="Centralize every client before the AI drafts anything."
          description="Search and manage client workspaces, then build the brand memory layer that keeps future campaigns aligned."
        />
        <Button asChild className="min-w-[180px] self-start lg:self-auto">
          <Link href="/clients/new">Create Client</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="text-xl">Filters</CardTitle>
          <CardDescription>
            Narrow the list by name, industry, location, or lifecycle status.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                defaultValue={query}
                name="query"
                placeholder="Search clients by name, industry, or location"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                className="flex h-11 min-w-[180px] rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
                defaultValue={status}
                name="status"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">
                Apply filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {clients.length === 0 ? (
        <RouteEmptyState
          description="No clients match the current filters. Clear the search, switch status, or create your first client workspace."
          eyebrow="No clients found"
          href="/clients/new"
          primaryLabel="Create your first client workspace"
          title="The client list is empty for this view"
        />
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="gap-4">
              <CardHeader className="flex flex-col gap-4 p-0 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-2xl">{client.name}</CardTitle>
                    <ClientStatusBadge status={client.status} />
                  </div>
                  <CardDescription className="leading-6">
                    {client.industry ?? "Industry not set"}{" "}
                    {client.location ? `• ${client.location}` : ""}
                  </CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/clients/${client.id}`}>Open client</Link>
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 p-0 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Website
                  </p>
                  {client.website ? (
                    <a
                      className="text-sm text-primary hover:underline"
                      href={client.website}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {client.website}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not provided</p>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Contact
                  </p>
                  <p className="text-sm text-foreground">
                    {client.contact_name ?? "Not provided"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {client.contact_email ?? "No email"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2 xl:col-span-2">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Description
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {client.description ?? "No client description yet."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Created
                  </p>
                  <p className="text-sm text-foreground">
                    {formatDateLabel(client.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
