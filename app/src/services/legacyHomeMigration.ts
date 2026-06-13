import { apiFetch } from "../lib/api";
import type { AdminPageDetail, PageBlockRecord } from "./siteSettings";

export type LegacyHomeMigrationPreview = {
  pageKey: "home";
  source: {
    legacySectionCount: number;
    publishedLegacySectionCount: number;
    lastUpdatedAt: string | null;
  };
  supportedMappings: Array<{
    sourceSectionKey: string;
    sourceFieldKeys: string[];
    targetBlockType: string;
    targetBlockId: string;
    proposedData: Record<string, unknown>;
    warnings: string[];
  }>;
  unsupportedItems: Array<{
    sourceSectionKey: string;
    fieldKey: string | null;
    reason:
      | "UNSUPPORTED_SECTION"
      | "UNSUPPORTED_FIELD"
      | "AMBIGUOUS_MAPPING"
      | "INVALID_VALUE"
      | "MISSING_REQUIRED_TARGET_FIELD";
    description: string;
  }>;
  summary: {
    totalSections: number;
    mappedSections: number;
    unsupportedSections: number;
    mappedFields: number;
    unsupportedFields: number;
    hasBlockingIssues: boolean;
  };
  proposedContent: {
    blocks: PageBlockRecord[];
  };
  sourceFingerprint: string;
  generatedAt: string;
};

export async function previewLegacyHomeMigration() {
  const response = await apiFetch<{ ok: true; preview: LegacyHomeMigrationPreview }>(
    "/admin/pages/home/legacy-migration/preview",
    {
      method: "POST",
    }
  );

  return response.preview;
}

export async function applyLegacyHomeMigration(input: {
  sourceFingerprint: string;
  proposedContent: { blocks: PageBlockRecord[] };
}) {
  const response = await apiFetch<{ ok: true; page: AdminPageDetail }>(
    "/admin/pages/home/legacy-migration/apply",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  return response.page;
}

export async function cancelLegacyHomeMigration(input: { sourceFingerprint?: string }) {
  await apiFetch<{ ok: true }>("/admin/pages/home/legacy-migration/cancel", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
