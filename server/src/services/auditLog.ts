import type { Prisma, PrismaClient } from "@prisma/client";

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function writeAuditLog(
  prisma: PrismaClient,
  options: {
    actorAdminUserId?: string | null;
    siteId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  const auditLogClient = (prisma as PrismaClient & {
    auditLog?: { create?: (args: { data: Record<string, unknown> }) => Promise<unknown> };
  }).auditLog;

  if (!auditLogClient?.create) {
    return null;
  }

  return auditLogClient.create({
    data: {
      actorAdminUserId: options.actorAdminUserId ?? null,
      siteId: options.siteId ?? null,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId ?? null,
      metadata: options.metadata ? toJsonInput(options.metadata) : undefined,
    },
  });
}
