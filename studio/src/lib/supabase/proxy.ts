import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";

const AUTH_PATHS = new Set(["/forgot-password", "/login", "/signup"]);
const PROTECTED_PATHS = [
  "/assets",
  "/campaigns",
  "/clients",
  "/content-calendar",
  "/dashboard",
  "/settings",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.has(pathname);
}

function buildRedirectResponse(request: NextRequest, pathname: string, searchParams?: URLSearchParams) {
  const redirectUrl = new URL(pathname, request.url);

  if (searchParams) {
    redirectUrl.search = searchParams.toString();
  }

  return NextResponse.redirect(redirectUrl);
}

function applyCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set(cookie);
  });
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next({
    request,
  });

  try {
    const env = getPublicEnv();
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });

            response = NextResponse.next({
              request,
            });

            cookiesToSet.forEach(({ name, options, value }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { data, error } = await supabase.auth.getClaims();
    const isAuthenticated = Boolean(data?.claims?.sub);

    if (error && isProtectedPath(pathname)) {
      const redirectResponse = buildRedirectResponse(
        request,
        "/login",
        new URLSearchParams({ error: "session_fetch_failed" }),
      );

      applyCookies(response, redirectResponse);
      return redirectResponse;
    }

    if (!isAuthenticated && isProtectedPath(pathname)) {
      const params = new URLSearchParams();
      params.set("next", pathname);

      const redirectResponse = buildRedirectResponse(request, "/login", params);
      applyCookies(response, redirectResponse);
      return redirectResponse;
    }

    if (isAuthenticated && isAuthPath(pathname)) {
      const redirectResponse = buildRedirectResponse(request, "/dashboard");
      applyCookies(response, redirectResponse);
      return redirectResponse;
    }

    return response;
  } catch {
    if (isProtectedPath(pathname)) {
      return buildRedirectResponse(
        request,
        "/login",
        new URLSearchParams({ error: "missing_env" }),
      );
    }

    return response;
  }
}
