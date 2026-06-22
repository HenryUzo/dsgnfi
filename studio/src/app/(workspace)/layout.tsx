import { StudioSidebar } from "@/components/shell/studio-sidebar";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { fetchCurrentAgencyMembership } from "@/lib/db/agencies";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, membership] = await Promise.all([
    requireAuthenticatedUser(),
    fetchCurrentAgencyMembership(),
  ]);

  return (
    <div className="min-h-screen bg-transparent lg:flex">
      <StudioSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <WorkspaceHeader userEmail={user.email} userRole={membership?.role ?? null} />
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
