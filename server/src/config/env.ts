import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  PORT: z.coerce.number().optional(),

  CORS_ORIGIN: z.string().min(1),

  DATABASE_URL: z.string().min(1).optional(),

  JWT_SECRET: z.string().min(1),
});

const parsedEnv = envSchema.parse(process.env);

const corsOrigins = parsedEnv.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  ...parsedEnv,
  corsOrigins: corsOrigins.length > 0 ? corsOrigins : [parsedEnv.CORS_ORIGIN],
};
