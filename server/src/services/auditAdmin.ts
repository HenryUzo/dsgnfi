import type { PrismaClient } from "@prisma/client";

export async function listRecentAuditLogs(
  prisma: PrismaClient,
  options: {
    siteId: string;
    limit?: number;
    action?: string | null;
  }
) {
  const entries = await prisma.auditLog.findMany({
    where: {
      siteId: options.siteId,
      ...(options.action ? { action: options.action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(options.limit ?? 25, 100)),
    include: {
      actorAdminUser: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return entries.map((entry) => ({
    id: entry.id,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata,
    createdAt: entry.createdAt,
    actor: entry.actorAdminUser
      ? {
          id: entry.actorAdminUser.id,
          email: entry.actorAdminUser.email,
        }
      : null,
  }));
}
