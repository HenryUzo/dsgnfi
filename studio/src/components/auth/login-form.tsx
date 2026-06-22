"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/form-state";

type LoginFormProps = {
  configured: boolean;
  nextPath?: string;
  notice?: string | null;
};

export function LoginForm({ configured, nextPath, notice }: LoginFormProps) {
  const [state, action] = useActionState(loginAction, initialAuthFormState);

  return (
    <Card className="border-white/10 bg-[rgba(10,15,28,0.9)]">
      <CardHeader className="space-y-4">
        <Badge variant="outline">Supabase Auth</Badge>
        <div className="space-y-2">
          <CardTitle className="text-3xl">Sign in to your workspace</CardTitle>
          <CardDescription className="leading-6">
            Use your Supabase email and password to access the protected agency workspace.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <AuthFeedback message={notice} tone="success" />
        {!configured ? (
          <AuthFeedback
            message="Supabase environment variables are missing. Create studio/.env.local before testing authentication."
          />
        ) : null}
        <AuthFeedback message={state.status === "error" ? state.message : null} />
        <form action={action} className="space-y-5">
          <input name="next" type="hidden" value={nextPath ?? "/dashboard"} />
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              aria-invalid={Boolean(state.fieldErrors?.email)}
              autoComplete="email"
              id="email"
              name="email"
              placeholder="henry@dsgnfi.com"
              type="email"
            />
            {state.fieldErrors?.email ? (
              <p className="text-sm text-rose-200">{state.fieldErrors.email}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              aria-invalid={Boolean(state.fieldErrors?.password)}
              autoComplete="current-password"
              id="password"
              name="password"
              placeholder="Enter your password"
              type="password"
            />
            {state.fieldErrors?.password ? (
              <p className="text-sm text-rose-200">{state.fieldErrors.password}</p>
            ) : null}
          </div>
          <SubmitButton idleLabel="Sign in" pendingLabel="Signing in" />
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 text-sm text-muted-foreground">
        <Link href="/forgot-password" className="text-primary">
          Forgot password
        </Link>
        <p>
          Need an account?{" "}
          <Link href="/signup" className="text-primary">
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
