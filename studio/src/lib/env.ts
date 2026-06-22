import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const openAIEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-5-mini"),
});

function formatIssues(prefix: string, issues: z.ZodIssue[]) {
  return `${prefix}: ${issues.map((issue) => issue.path.join(".")).join(", ")}`;
}

function parsePublicEnv() {
  return publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getPublicEnv() {
  const result = parsePublicEnv();

  if (!result.success) {
    throw new Error(formatIssues("Missing public environment variables", result.error.issues));
  }

  if (result.data.NEXT_PUBLIC_SUPABASE_URL.includes("supabase.com/dashboard/project/")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be your Supabase project API URL, for example https://<project-ref>.supabase.co, not the dashboard URL.",
    );
  }

  return result.data;
}

export function getPublicEnvStatus() {
  const result = parsePublicEnv();

  if (!result.success) {
    return {
      configured: false as const,
      message: formatIssues("Missing public environment variables", result.error.issues),
    };
  }

  if (result.data.NEXT_PUBLIC_SUPABASE_URL.includes("supabase.com/dashboard/project/")) {
    return {
      configured: false as const,
      message:
        "NEXT_PUBLIC_SUPABASE_URL must be your Supabase project API URL, for example https://<project-ref>.supabase.co, not the dashboard URL.",
    };
  }

  return {
    configured: true as const,
    message: null,
  };
}

export function getServerEnv() {
  const result = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!result.success) {
    throw new Error(formatIssues("Missing server environment variables", result.error.issues));
  }

  return result.data;
}

export function getServerEnvStatus() {
  const result = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!result.success) {
    return {
      configured: false as const,
      message: formatIssues("Missing server environment variables", result.error.issues),
    };
  }

  return {
    configured: true as const,
    message: null,
  };
}

export function getOpenAIEnv() {
  const result = openAIEnvSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-5-mini",
  });

  if (!result.success) {
    throw new Error("OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local.");
  }

  return result.data;
}

export function getOpenAIEnvStatus() {
  const result = openAIEnvSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-5-mini",
  });

  if (!result.success) {
    return {
      configured: false as const,
      message: "OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local.",
    };
  }

  return {
    configured: true as const,
    message: null,
  };
}
