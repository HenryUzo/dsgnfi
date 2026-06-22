import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { mapAuthQueryMessage } from "@/lib/auth/errors";
import { getAuthSessionState } from "@/lib/auth/session";
import { getPublicEnvStatus } from "@/lib/env";

type SignupPageProps = {
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const [{ notice }, session, envStatus] = await Promise.all([
    searchParams,
    getAuthSessionState(),
    Promise.resolve(getPublicEnvStatus()),
  ]);

  if (session.user) {
    redirect("/dashboard");
  }

  return (
    <SignupForm
      configured={envStatus.configured}
      notice={mapAuthQueryMessage(notice)}
    />
  );
}
