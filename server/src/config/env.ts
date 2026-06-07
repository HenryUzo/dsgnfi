import { z } from "zod";

const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  });

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional()
);

const nonEmptyStringWithDefault = (defaultValue: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).default(defaultValue)
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  PORT: z.coerce.number().optional(),

  CORS_ORIGIN: z.string().min(1).default("http://localhost:5174"),
  FRONTEND_ORIGIN: z.string().url().optional(),
  BACKEND_ORIGIN: z.string().url().optional(),

  DATABASE_URL: z.string().min(1).optional(),

  JWT_SECRET: z.string().min(1),
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_MODEL: nonEmptyStringWithDefault("gpt-5-mini"),

  APP_BASE_DOMAIN: z.string().min(1).optional(),
  UPLOADS_DIR: z.string().min(1).optional(),
  DEFAULT_TENANT_SLUG: z.string().min(1).default("dsgnfi"),
  DEFAULT_SITE_SLUG: z.string().min(1).default("main"),
  ALLOW_DEV_SITE_QUERY_OVERRIDE: boolFromString.default(true),
});

const parsedEnv = envSchema.parse(process.env);

const corsOrigins = parsedEnv.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  ...parsedEnv,
  corsOrigins: corsOrigins.length > 0 ? corsOrigins : [parsedEnv.CORS_ORIGIN],
};
