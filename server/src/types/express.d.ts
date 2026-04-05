import type { MembershipRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        tenantId?: string;
        siteId?: string;
      };
      context?: {
        user?: {
          id: string;
          email: string;
        };
        tenantId: string;
        tenantSlug: string;
        siteId: string;
        siteSlug: string;
        membershipRole?: MembershipRole;
      };
    }
  }
}

export {};
