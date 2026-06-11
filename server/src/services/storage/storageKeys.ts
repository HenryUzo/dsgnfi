import path from "path";
import crypto from "crypto";

import type { StorageObjectContext } from "./types";

function safeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "item";
}

export function sanitizeFilename(value: string) {
  const normalized = (value || "file").replace(/\\/g, "/");
  const basename = path.basename(normalized);
  const ext = path.extname(basename).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 16);
  const stem = path
    .basename(basename, path.extname(basename))
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${stem || "file"}${ext || ""}`;
}

export function buildStorageKey(context: StorageObjectContext) {
  const safeFilename = sanitizeFilename(context.filename);
  const uniquePrefix = crypto.randomUUID();
  const tenant = safeSegment(context.tenantId);
  const site = safeSegment(context.siteId);
  const owner = safeSegment(context.ownerId);

  switch (context.category) {
    case "asset":
      return `tenants/${tenant}/sites/${site}/assets/${owner}/${safeFilename}`;
    case "template-import":
      return `tenants/${tenant}/sites/${site}/template-imports/${owner}/${uniquePrefix}-${safeFilename}`;
    case "ai-prefill":
      return `tenants/${tenant}/sites/${site}/ai-prefill/${owner}/${uniquePrefix}-${safeFilename}`;
    case "temp":
      return `tenants/${tenant}/sites/${site}/temp/${owner}/${uniquePrefix}-${safeFilename}`;
  }
}
