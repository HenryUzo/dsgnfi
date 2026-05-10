import type { MembershipRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { apiError } from "../services/apiErrors";

export function requireRole(allowedRoles: MembershipRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.context?.membershipRole;

    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json(
        apiError(
          "insufficient_role",
          "You do not have permission for this action."
        )
      );
    }

    return next();
  };
}
