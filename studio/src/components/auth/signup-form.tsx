"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/form-state";

type SignupFormProps = {
  configured: boolean;
  notice?: string | null;
};

export function SignupForm({ configured, notice }: SignupFormProps) {
  const [state, action] = useActionState(signupAction, initialAuthFormState);

  return (
    <Card className="border-white/10 bg-[rgba(10,15,28,0.9)]">
      <CardHeader className="space-y-4">
        <Badge variant="outline">Agency Onboarding</Badge>
        <div className="space-y-2">
          <CardTitle className="text-3xl">Create the agency workspace</CardTitle>
          <CardDescription className="leading-6">
            Signup is limited to email and password for the MVP. Roles, invites, and workspace metadata come later.
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
        <AuthFeedback
          message={state.message}
          tone={state.status === "success" ? "success" : "error"}
        />
        <form action={action} className="space-y-5">
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
              autoComplete="new-password"
              id="password"
              name="password"
              placeholder="Use at least 8 characters"
              type="password"
            />
            {state.fieldErrors?.password ? (
              <p className="text-sm text-rose-200">{state.fieldErrors.password}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
              autoComplete="new-password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Repeat the password"
              type="password"
            />
            {state.fieldErrors?.confirmPassword ? (
              <p className="text-sm text-rose-200">{state.fieldErrors.confirmPassword}</p>
            ) : null}
          </div>
          <SubmitButton idleLabel="Create account" pendingLabel="Creating account" />
        </form>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <p>
          Already set up?{" "}
          <Link href="/login" className="text-primary">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
