"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mapSupabaseAuthError } from "@/lib/auth/errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type UpdatePasswordFormProps = {
  notice?: string | null;
};

export function UpdatePasswordForm({ notice }: UpdatePasswordFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<{
    confirmPassword?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function validateRecoverySession() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (error || !data.user) {
          setFormError(
            "Open the latest recovery link from your email before setting a new password.",
          );
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        setFormError(
          error instanceof Error
            ? error.message
            : "Failed to verify the recovery session.",
        );
      } finally {
        if (mounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void validateRecoverySession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const nextFieldErrors: typeof fieldErrors = {};

    if (password.length < 8) {
      nextFieldErrors.password = "Use at least 8 characters.";
    }

    if (confirmPassword.length < 8) {
      nextFieldErrors.confirmPassword = "Use at least 8 characters.";
    } else if (password !== confirmPassword) {
      nextFieldErrors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFormError("Fix the highlighted fields and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setFormError(mapSupabaseAuthError(error.message));
        return;
      }

      router.push("/login?notice=password_updated");
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to update the password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-white/10 bg-[rgba(10,15,28,0.9)]">
      <CardHeader className="space-y-4">
        <Badge variant="outline">Recovery</Badge>
        <div className="space-y-2">
          <CardTitle className="text-3xl">Set a new password</CardTitle>
          <CardDescription className="leading-6">
            Finish the recovery flow by choosing a fresh password for your Supabase account.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <AuthFeedback message={notice} tone="success" />
        <AuthFeedback message={formError} />
        {isCheckingSession ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
            Verifying your recovery session...
          </div>
        ) : null}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              aria-invalid={Boolean(fieldErrors.password)}
              autoComplete="new-password"
              id="password"
              name="password"
              placeholder="Use at least 8 characters"
              type="password"
            />
            {fieldErrors.password ? (
              <p className="text-sm text-rose-200">{fieldErrors.password}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              autoComplete="new-password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Repeat the new password"
              type="password"
            />
            {fieldErrors.confirmPassword ? (
              <p className="text-sm text-rose-200">{fieldErrors.confirmPassword}</p>
            ) : null}
          </div>
          <Button
            className="w-full"
            disabled={isCheckingSession || isSubmitting}
            type="submit"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Updating password" : "Update password"}
          </Button>
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
