import { apiFetch } from "../lib/api";
import type { ProjectContent } from "../components/work/blockTypes";

export type ProcessAdminContentResponse = {
  ok: true;
  data: ProjectContent;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
};

export async function getProcessContent() {
  return apiFetch<ProcessAdminContentResponse>("/admin/process/content");
}

export async function saveProcessDraft(content: ProjectContent) {
  return apiFetch<{ ok: true; data: ProjectContent }>("/admin/process/content", {
    method: "PUT",
    body: JSON.stringify(content),
  });
}

export async function publishProcessContent() {
  return apiFetch<{ ok: true; data: ProjectContent }>("/admin/process/content/publish", {
    method: "POST",
  });
}
