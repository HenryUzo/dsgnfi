import { apiFetch } from "../lib/api";

export type PublishStatus = "DRAFT" | "PUBLISHED";

export type WorkMeta = {
  title: string;
  subtitle: string;
  status: PublishStatus;
  publishedAt: string | null;
};

export type WorkTag = {
  id: string;
  name: string;
  slug: string;
};

export type WorkProject = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  templateId: string;
  status: PublishStatus;
  publishedAt: string | null;
  tags: WorkTag[];
  tagIds: string[];
  draftContent: Record<string, unknown>;
};

type WorkMetaResponse = {
  title: string;
  subtitle: string;
  status: PublishStatus;
  publishedAt: string | null;
};

type WorkTagResponse = {
  tag: WorkTag;
};

type WorkTagsResponse = {
  tags: WorkTag[];
};

type WorkProjectsResponse = {
  projects: WorkProject[];
};

type WorkProjectResponse = {
  project: WorkProject;
};

export async function getWorkMeta() {
  return apiFetch<WorkMetaResponse>("/admin/work/meta");
}

export async function saveWorkMetaDraft(input: {
  title: string;
  subtitle: string;
}) {
  return apiFetch<{ ok: true }>("/admin/work/meta", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function publishWorkMeta() {
  return apiFetch<{ ok: true }>("/admin/work/meta/publish", {
    method: "POST",
  });
}

export async function listWorkTags() {
  const response = await apiFetch<WorkTagsResponse>("/admin/work/tags");
  return response.tags;
}

export async function createWorkTag(input: { name: string; slug: string }) {
  const response = await apiFetch<WorkTagResponse>("/admin/work/tags", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.tag;
}

export async function updateWorkTag(
  id: string,
  input: { name: string; slug: string }
) {
  const response = await apiFetch<WorkTagResponse>(`/admin/work/tags/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.tag;
}

export async function deleteWorkTag(id: string) {
  return apiFetch<{ ok: true }>(`/admin/work/tags/${id}`, {
    method: "DELETE",
  });
}

export async function listWorkProjects() {
  const response = await apiFetch<WorkProjectsResponse>("/admin/work/projects");
  return response.projects;
}

export async function getWorkProject(id: string) {
  const response = await apiFetch<WorkProjectResponse>(`/admin/work/projects/${id}`);
  return response.project;
}

export async function createWorkProject(input: {
  templateId: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tagIds: string[];
  draftContent: Record<string, unknown>;
}) {
  const response = await apiFetch<WorkProjectResponse>("/admin/work/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.project;
}

export async function updateWorkProject(
  id: string,
  input: {
    title: string;
    slug: string;
    excerpt: string;
    coverImage: string;
    tagIds: string[];
    draftContent: Record<string, unknown>;
  }
) {
  const response = await apiFetch<WorkProjectResponse>(`/admin/work/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return response.project;
}

export async function publishWorkProject(id: string) {
  return apiFetch<{ ok: true }>(`/admin/work/projects/${id}/publish`, {
    method: "POST",
  });
}

export async function duplicateWorkProject(id: string) {
  const response = await apiFetch<WorkProjectResponse>(`/admin/work/projects/${id}/duplicate`, {
    method: "POST",
  });
  return response.project;
}
