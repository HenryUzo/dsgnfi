import type { Json } from "@/types/database";

export const ASSET_STORAGE_BUCKET = "agency-assets";
export const MAX_ASSET_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const allowedAssetMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export type AllowedAssetMimeType = (typeof allowedAssetMimeTypes)[number];

export type AssetTypeFilter =
  | "all"
  | "document"
  | "image"
  | "pdf"
  | "presentation";

export type AssetFormValues = {
  campaign_id: string;
  client_id: string;
  name: string;
  notes: string;
  tags: string;
};

export type AssetFormState = {
  errors?: Partial<Record<"campaign_id" | "client_id" | "file" | "name", string>>;
  message?: string;
  redirectTo?: string;
  status: "error" | "idle" | "success";
  values?: AssetFormValues;
};

export type AssetDeleteState = {
  message?: string;
  redirectTo?: string;
  status: "error" | "idle" | "success";
};

export const initialAssetFormState: AssetFormState = {
  status: "idle",
};

export const initialAssetDeleteState: AssetDeleteState = {
  status: "idle",
};

export function parseAssetTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function formatAssetTags(value: Json | null | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function getAssetTypeFilterLabel(value: AssetTypeFilter) {
  switch (value) {
    case "document":
      return "Documents";
    case "image":
      return "Images";
    case "pdf":
      return "PDFs";
    case "presentation":
      return "Presentations";
    default:
      return "All types";
  }
}

export function classifyAssetType(mimeType: string): Exclude<AssetTypeFilter, "all"> {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  if (
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return "presentation";
  }

  return "document";
}

export function isAssetImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function getAssetTypeLabel(mimeType: string) {
  switch (classifyAssetType(mimeType)) {
    case "image":
      return "Image";
    case "pdf":
      return "PDF";
    case "presentation":
      return "Presentation";
    default:
      return "Document";
  }
}
