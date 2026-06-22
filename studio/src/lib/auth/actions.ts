"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getActionErrorMessage } from "@/lib/errors";
import { getPublicEnv } from "@/lib/env";
import { mapSupabaseAuthError } from "@/lib/auth/errors";
import { initialAuthFormState, type AuthFormState } from "@/lib/auth/form-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email("Enter a valid email address.");

const loginSchema = z.object({
  email: emailSchema,
  next: z.string().optional(),
  password: z.string().min(1, "Enter your password."),
});

const signupSchema = z
  .object({
    confirmPassword: z.string().min(8, "Use at least 8 characters."),
    email: emailSchema,
    password: z.string().min(8, "Use at least 8 characters."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const updatePasswordSchema = z
  .object({
    confirmPassword: z.string().min(8, "Use at least 8 characters."),
    password: z.string().min(8, "Use at least 8 characters."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function buildFieldErrors(issues: z.ZodIssue[]) {
  return issues.reduce<AuthFormState["fieldErrors"]>((errors, issue) => {
    const path = issue.path[0];

    if (typeof path === "string" && (path === "confirmPassword" || path === "email" || path === "password")) {
      return {
        ...errors,
        [path]: issue.message,
      };
    }

    return errors;
  }, {});
}

function getErrorMessage(error: unknown) {
  return getActionErrorMessage(error, "Unexpected authentication error.");
}

function sanitizeNextPath(nextPath: string | undefined): Route {
  if (!nextPath) {
    return "/dashboard";
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath as Route;
}

function invalidFormState(issues: z.ZodIssue[]): AuthFormState {
  return {
    fieldErrors: buildFieldErrors(issues),
    message: "Fix the highlighted fields and try again.",
    status: "error",
  };
}

export async function loginAction(
  previousState: AuthFormState = initialAuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  void previousState;

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return invalidFormState(parsed.error.issues);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return {
        message: mapSupabaseAuthError(error.message),
        status: "error",
      };
    }
  } catch (error) {
    return {
      message: getErrorMessage(error),
      status: "error",
    };
  }

  redirect(sanitizeNextPath(parsed.data.next));
}

export async function signupAction(
  previousState: AuthFormState = initialAuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  void previousState;
  let shouldRedirectToDashboard = false;

  const parsed = signupSchema.safeParse({
    confirmPassword: formData.get("confirmPassword"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return invalidFormState(parsed.error.issues);
  }

  try {
    const env = getPublicEnv();
    const supabase = await createSupabaseServerClient();
    const callbackUrl = new URL("/auth/callback", env.NEXT_PUBLIC_APP_URL);
    callbackUrl.searchParams.set("next", "/dashboard");

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      return {
        message: mapSupabaseAuthError(error.message),
        status: "error",
      };
    }

    if (data.session) {
      shouldRedirectToDashboard = true;
    }
  } catch (error) {
    return {
      message: getErrorMessage(error),
      status: "error",
    };
  }

  if (shouldRedirectToDashboard) {
    redirect("/dashboard");
  }

  return {
    message:
      "Account created. Check your email for the confirmation link before signing in.",
    status: "success",
  };
}

export async function forgotPasswordAction(
  previousState: AuthFormState = initialAuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  void previousState;

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return invalidFormState(parsed.error.issues);
  }

  try {
    const env = getPublicEnv();
    const supabase = await createSupabaseServerClient();
    const redirectUrl = new URL("/update-password", env.NEXT_PUBLIC_APP_URL);

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: redirectUrl.toString(),
    });

    if (error) {
      return {
        message: mapSupabaseAuthError(error.message),
        status: "error",
      };
    }

    return {
      message:
        "Password reset instructions have been sent if the account exists for that email.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getErrorMessage(error),
      status: "error",
    };
  }
}

export async function updatePasswordAction(
  previousState: AuthFormState = initialAuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  void previousState;

  const parsed = updatePasswordSchema.safeParse({
    confirmPassword: formData.get("confirmPassword"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return invalidFormState(parsed.error.issues);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return {
        message: mapSupabaseAuthError(error.message),
        status: "error",
      };
    }
  } catch (error) {
    return {
      message: getErrorMessage(error),
      status: "error",
    };
  }

  redirect("/login?notice=password_updated");
}

export async function logoutAction(
  previousState: AuthFormState = initialAuthFormState,
  formData?: FormData,
): Promise<AuthFormState> {
  void previousState;
  void formData;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        message: "Logout failed. Please try again.",
        status: "error",
      };
    }
  } catch {
    return {
      message: "Logout failed. Please try again.",
      status: "error",
    };
  }

  redirect("/login?notice=signed_out");
}
