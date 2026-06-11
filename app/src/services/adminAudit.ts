import { apiFetch } from "../lib/api";

export type AdminAuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    email: string;
  } | null;
};

export async function listAdminAuditEntries(options?: {
  limit?: number;
  action?: string | null;
}) {
  const params = new URLSearchParams();
  if (options?.limit) {
    params.set("limit", String(options.limit));
  }
  if (options?.action) {
    params.set("action", options.action);
  }

  const search = params.size > 0 ? `?${params.toString()}` : "";
  const response = await apiFetch<{ ok: true; entries: AdminAuditEntry[] }>(
    `/admin/audit${search}`
  );
  return response.entries;
}
