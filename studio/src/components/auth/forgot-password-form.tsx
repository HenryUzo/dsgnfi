"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/form-state";

type ForgotPasswordFormProps = {
  configured: boolean;
  notice?: string | null;
};

export function ForgotPasswordForm({
  configured,
  notice,
}: ForgotPasswordFormProps) {
  const [state, action] = useActionState(
    forgotPasswordAction,
    initialAuthFormState,
  );

  return (
    <Card className="border-white/10 bg-[rgba(10,15,28,0.9)]">
      <CardHeader className="space-y-4">
        <Badge variant="outline">Recovery</Badge>
        <div className="space-y-2">
          <CardTitle className="text-3xl">Reset access</CardTitle>
          <CardDescription className="leading-6">
            Request a reset email from Supabase. The link should send you back to this workspace to set a new password.
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
          <SubmitButton idleLabel="Send reset link" pendingLabel="Sending reset link" />
        </form>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <p>
          Back to{" "}
          <Link href="/login" className="text-primary">
            sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
