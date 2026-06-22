import { cache } from "react";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export type AuthSessionState = {
  error: string | null;
  user: AuthenticatedUser | null;
};

function getRuntimeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown authentication error.";
}

export const getAuthSessionState = cache(async (): Promise<AuthSessionState> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      return {
        error: "Failed to fetch the current Supabase session.",
        user: null,
      };
    }

    const claims = data?.claims;

    if (!claims?.sub) {
      return {
        error: null,
        user: null,
      };
    }

    return {
      error: null,
      user: {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : null,
      },
    };
  } catch (error) {
    return {
      error: getRuntimeErrorMessage(error),
      user: null,
    };
  }
});

export async function requireAuthenticatedUser() {
  const session = await getAuthSessionState();

  if (session.error) {
    redirect("/login?error=session_fetch_failed");
  }

  if (!session.user) {
    redirect("/login");
  }

  return session.user;
}
