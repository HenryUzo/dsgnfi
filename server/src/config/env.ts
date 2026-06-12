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
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_PUBLIC_BASE_URL: optionalNonEmptyString,
  STORAGE_PRIVATE_BASE_URL: optionalNonEmptyString,
  STORAGE_LOCAL_PUBLIC_DIR: optionalNonEmptyString,
  STORAGE_LOCAL_PRIVATE_DIR: optionalNonEmptyString,
  STORAGE_BUCKET: optionalNonEmptyString,
  STORAGE_REGION: optionalNonEmptyString,
  STORAGE_ENDPOINT: optionalNonEmptyString,
  STORAGE_FORCE_PATH_STYLE: boolFromString.default(false),
  STORAGE_ACCESS_KEY_ID: optionalNonEmptyString,
  STORAGE_SECRET_ACCESS_KEY: optionalNonEmptyString,
  DEFAULT_TENANT_SLUG: z.string().min(1).default("dsgnfi"),
  DEFAULT_SITE_SLUG: z.string().min(1).default("main"),
  ALLOW_DEV_SITE_QUERY_OVERRIDE: boolFromString.default(true),
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.STORAGE_PROVIDER === "s3") {
  const missing = [
    ["STORAGE_BUCKET", parsedEnv.STORAGE_BUCKET],
    ["STORAGE_REGION", parsedEnv.STORAGE_REGION],
    ["STORAGE_ENDPOINT", parsedEnv.STORAGE_ENDPOINT],
    ["STORAGE_ACCESS_KEY_ID", parsedEnv.STORAGE_ACCESS_KEY_ID],
    ["STORAGE_SECRET_ACCESS_KEY", parsedEnv.STORAGE_SECRET_ACCESS_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing S3 storage configuration: ${missing.join(", ")}`);
  }
}

const corsOrigins = parsedEnv.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  ...parsedEnv,
  corsOrigins: corsOrigins.length > 0 ? corsOrigins : [parsedEnv.CORS_ORIGIN],
};
