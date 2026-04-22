CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorAdminUserId" UUID,
    "siteId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_siteId_createdAt_idx" ON "AuditLog"("siteId", "createdAt");
CREATE INDEX "AuditLog_actorAdminUserId_createdAt_idx" ON "AuditLog"("actorAdminUserId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_actorAdminUserId_fkey"
FOREIGN KEY ("actorAdminUserId") REFERENCES "AdminUser"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
