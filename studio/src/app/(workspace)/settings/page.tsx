import { AlertTriangle, CheckCircle2, Database, KeyRound, ShieldCheck, Upload } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_VERSION } from "@/lib/app-config";
import { getAuthSessionState } from "@/lib/auth/session";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";
import { getOpenAIEnvStatus, getPublicEnvStatus, getServerEnvStatus } from "@/lib/env";

function HealthCard({
  configured,
  description,
  icon: Icon,
  message,
  title,
}: {
  configured: boolean;
  description: string;
  icon: typeof CheckCircle2;
  message: string | null;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <Badge variant={configured ? "success" : "warning"}>
            {configured ? "Configured" : "Needs attention"}
          </Badge>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      {message ? <p className="mt-3 text-sm leading-6 text-rose-100">{message}</p> : null}
    </div>
  );
}

export default async function SettingsPage() {
  const [membership, session, publicEnv, serverEnv, openAIEnv] = await Promise.all([
    fetchCurrentAgencyMembership(),
    getAuthSessionState(),
    Promise.resolve(getPublicEnvStatus()),
    Promise.resolve(getServerEnvStatus()),
    Promise.resolve(getOpenAIEnvStatus()),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace Controls"
        title="Review environment health, workspace identity, and MVP boundaries."
        description="Settings stays intentionally narrow in the MVP: validate infrastructure, confirm agency access, and keep the execution scope disciplined before production rollout."
      />

      {!membership ? (
        <Card className="border-amber-500/20 bg-amber-500/10">
          <CardHeader className="p-0">
            <CardTitle className="text-2xl">No active agency membership found</CardTitle>
            <CardDescription className="leading-6 text-amber-100">
              No active agency membership found for this account. Add this user to agency_members or create an agency membership.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="p-0">
            <Badge variant="outline">Workspace profile</Badge>
            <CardTitle className="text-2xl">Current workspace identity</CardTitle>
            <CardDescription>
              The settings page confirms who is signed in, which agency scope is active, and what role applies to this session.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-0 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Agency name
              </p>
              <p className="text-sm text-foreground">{membership?.agency.name ?? "No agency linked"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Current role
              </p>
              <p className="text-sm text-foreground">
                {membership?.role.replace(/_/g, " ") ?? "No role assigned"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Current user email
              </p>
              <p className="text-sm text-foreground">{session.user?.email ?? "Authenticated user email unavailable"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Application version
              </p>
              <p className="text-sm text-foreground">{APP_VERSION}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-0">
            <Badge variant="outline">MVP phase notice</Badge>
            <CardTitle className="text-2xl">Final polish phase boundaries</CardTitle>
            <CardDescription>
              This release is the final Content + Campaign MVP polish pass, not a channel integration or billing phase.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-0">
            {[
              "No billing, team invites, or advanced permissions in this phase.",
              "Publishing remains manual. There is no automated scheduling or social posting.",
              "OpenAI usage stays server-side only. No secrets belong in client components.",
              "Supabase RLS remains the primary guardrail for agency-scoped records.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-0">
          <Badge variant="outline">Environment health</Badge>
          <CardTitle className="text-2xl">Configuration checks</CardTitle>
          <CardDescription>
            Validate the public Supabase variables, server-only service role key, and OpenAI server configuration before deployment.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-0 md:grid-cols-3">
          <HealthCard
            configured={publicEnv.configured}
            description="Public app URL and client-safe Supabase variables used by browser and SSR clients."
            icon={Database}
            message={publicEnv.message}
            title="Supabase public config"
          />
          <HealthCard
            configured={serverEnv.configured}
            description="Server-only Supabase service role key used for signed URLs and storage administration."
            icon={ShieldCheck}
            message={serverEnv.message}
            title="Service role config"
          />
          <HealthCard
            configured={openAIEnv.configured}
            description="Server-only OpenAI API key used for campaign strategy and content generation routes."
            icon={KeyRound}
            message={openAIEnv.message}
            title="OpenAI config"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="p-0">
            <Badge variant="outline">Storage bucket guidance</Badge>
            <CardTitle className="text-2xl">Asset library storage checklist</CardTitle>
            <CardDescription>
              The Asset Library depends on a private bucket and agency-scoped storage policies.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-0">
            {[
              "Bucket name must be exactly agency-assets.",
              "Keep the bucket private and use signed URLs for previews and downloads.",
              "Run studio/supabase/storage/agency-assets.sql to create the bucket and policies.",
              "Allowed file types are limited to the documented office formats, PDFs, and image types.",
              "Maximum upload size remains 10MB per file.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-0">
            <Badge variant="warning">Production reminders</Badge>
            <CardTitle className="text-2xl">Security and deployment notes</CardTitle>
            <CardDescription>
              These are the final checks before pushing the MVP toward Vercel and real agency usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-0">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                <p className="font-medium text-foreground">Secrets stay server-only</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` should never be referenced by client components, browser bundles, or logs.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <p className="font-medium text-foreground">Uploads require both auth and validation</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Asset uploads remain authenticated, agency-scoped, MIME-restricted, and size-limited before touching storage.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <p className="font-medium text-foreground">RLS is the main data boundary</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                If workspace pages appear empty, verify the signed-in user has an active agency membership and that seeded rows share the same agency_id.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
