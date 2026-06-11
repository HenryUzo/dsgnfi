import { apiFetch } from "../lib/api";
import type { ProjectContent } from "../components/work/blockTypes";

export type ProcessPublicContentResponse = {
  ok: true;
  data: ProjectContent | null;
};

export async function getProcessContent() {
  return apiFetch<ProcessPublicContentResponse>("/public/process/content");
}
