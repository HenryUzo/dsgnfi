import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { mapAuthQueryMessage } from "@/lib/auth/errors";
import { getAuthSessionState } from "@/lib/auth/session";
import { getPublicEnvStatus } from "@/lib/env";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    notice?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ error, next, notice }, session, envStatus] = await Promise.all([
    searchParams,
    getAuthSessionState(),
    Promise.resolve(getPublicEnvStatus()),
  ]);

  if (session.user) {
    redirect("/dashboard");
  }

  return (
    <LoginForm
      configured={envStatus.configured}
      nextPath={next}
      notice={mapAuthQueryMessage(error) ?? mapAuthQueryMessage(notice)}
    />
  );
}
