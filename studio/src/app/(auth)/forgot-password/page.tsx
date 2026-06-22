import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { mapAuthQueryMessage } from "@/lib/auth/errors";
import { getAuthSessionState } from "@/lib/auth/session";
import { getPublicEnvStatus } from "@/lib/env";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const [{ notice }, session, envStatus] = await Promise.all([
    searchParams,
    getAuthSessionState(),
    Promise.resolve(getPublicEnvStatus()),
  ]);

  if (session.user) {
    redirect("/dashboard");
  }

  return (
    <ForgotPasswordForm
      configured={envStatus.configured}
      notice={mapAuthQueryMessage(notice)}
    />
  );
}
