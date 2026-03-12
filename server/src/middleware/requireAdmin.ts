import type { NextFunction, Request, Response } from "express";

import { verifyToken } from "../auth/jwt";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.cms_token as string | undefined;

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: { message: "Unauthorized" },
    });
  }

  try {
    const payload = verifyToken(token);
    req.admin = { id: payload.id, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({
      ok: false,
      error: { message: "Unauthorized" },
    });
  }
}
