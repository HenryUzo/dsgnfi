import jwt from "jsonwebtoken";
import { z } from "zod";

import { env } from "../config/env";

const tokenSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  // Tenant/site ids are opaque identifiers in this app. Do not over-constrain
  // them here, or valid live tokens will fail verification if the underlying
  // database id format is not a strict RFC UUID.
  tenantId: z.string().min(1).optional(),
  siteId: z.string().min(1).optional(),
});

export type AdminJwtPayload = z.infer<typeof tokenSchema>;

export function signToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AdminJwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  return tokenSchema.parse(decoded);
}
