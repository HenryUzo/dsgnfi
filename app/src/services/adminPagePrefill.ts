import { apiFetch } from "../lib/api";

export type AdminPrefillArtifact = {
  id: string;
  runId?: string;
  name: string;
  mimeType: string;
  kind: "text" | "document" | "image";
  sizeBytes: number;
  status: "ACTIVE" | "EXPIRED" | "DELETED";
  expiresAt: string;
  retainedUntil: string | null;
  deletedAt: string | null;
  hasExtractedText: boolean;
};

export type AdminPagePrefillSuggestion = {
  runId?: string;
  generatedAt?: string | null;
  artifacts?: AdminPrefillArtifact[];
  analysis?: {
    brandName: string | null;
    positioning: string | null;
    audience: string[];
    services: string[];
    tone: string | null;
    notes: string[];
  } | null;
  page: {
    title?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
  };
  blocks: Array<{
    id?: string;
    blockId: string;
    blockType: string;
    label: string;
    summary: string;
    dataPatch: Record<string, unknown>;
    confidence: number;
    notes: string | null;
  }>;
};

export async function uploadPagePrefillArtifacts(input: {
  pageKey: string;
  files: Array<{
    name: string;
    mimeType: string;
    dataUrl: string;
  }>;
}) {
  const response = await apiFetch<{ ok: true; runId?: string; artifacts: AdminPrefillArtifact[] }>(
    "/admin/ai/prefill-artifacts",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  return response.artifacts.map((artifact) => ({
    ...artifact,
    runId: artifact.runId ?? response.runId,
  }));
}

export async function getPagePrefillSuggestions(pageKey: string, artifactIds: string[]) {
  const response = await apiFetch<{ ok: true; suggestions: AdminPagePrefillSuggestion }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/ai/prefill`,
    {
      method: "POST",
      body: JSON.stringify({ artifactIds }),
    }
  );

  return response.suggestions;
}

export async function getLatestPagePrefillReview(pageKey: string) {
  const response = await apiFetch<{ ok: true; suggestions: AdminPagePrefillSuggestion | null }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/ai/prefill/latest`
  );

  return response.suggestions;
}

export async function recordPagePrefillApplied(
  pageKey: string,
  runId: string,
  input: {
    selectedMetadata: string[];
    selectedSuggestionIds: string[];
    appliedPatch: Record<string, unknown>;
  }
) {
  await apiFetch<{ ok: true }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/ai/prefill/${encodeURIComponent(runId)}/apply`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export async function recordPagePrefillRejected(pageKey: string, runId: string) {
  await apiFetch<{ ok: true }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/ai/prefill/${encodeURIComponent(runId)}/reject`,
    {
      method: "POST",
    }
  );
}

export async function deletePagePrefillBrief(pageKey: string, runId: string) {
  const response = await apiFetch<{ ok: true; suggestions: AdminPagePrefillSuggestion | null }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/ai/prefill/${encodeURIComponent(runId)}/brief`,
    {
      method: "DELETE",
    }
  );

  return response.suggestions;
}
