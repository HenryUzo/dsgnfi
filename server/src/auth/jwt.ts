import jwt from "jsonwebtoken";

import { env } from "../config/env";

export type AdminJwtPayload = {
  id: string;
  email: string;
};

export function signToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AdminJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload;
}
