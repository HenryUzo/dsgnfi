import { normalizeProjectContent } from "../components/work/blockTypes";

import { apiFetch } from "../lib/api";

export type WorkPublicMeta = {
  title: string;
  subtitle: string;
};

export type WorkPublicTag = {
  id: string;
  name: string;
  slug: string;
};

export type WorkPublicProject = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tags: WorkPublicTag[];
  content: { blocks: Array<Record<string, unknown>> };
};

type MetaResponse = {
  title: string;
  subtitle: string;
};

type TagsResponse = {
  tags: WorkPublicTag[];
};

type ProjectRaw = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tags: WorkPublicTag[];
  content?: unknown;
};

type ProjectsResponse = {
  projects: ProjectRaw[];
};

type ProjectResponse = {
  project: ProjectRaw;
};

function normalizeProject(raw: ProjectRaw): WorkPublicProject {
  const content = normalizeProjectContent(raw.content ?? {});
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    coverImage: raw.coverImage,
    tags: raw.tags ?? [],
    content: content as unknown as { blocks: Array<Record<string, unknown>> },
  };
}

export async function getWorkPublicMeta() {
  return apiFetch<MetaResponse>("/public/work/meta");
}

export async function getWorkPublicTags() {
  const response = await apiFetch<TagsResponse>("/public/work/tags");
  return response.tags;
}

export async function getWorkPublicProjects(tagSlug?: string) {
  const query = tagSlug ? `?tag=${encodeURIComponent(tagSlug)}` : "";
  const response = await apiFetch<ProjectsResponse>(`/public/work/projects${query}`);
  return response.projects.map(normalizeProject);
}

export async function getWorkPublicProjectBySlug(slug: string) {
  const response = await apiFetch<ProjectResponse>(
    `/public/work/projects/${encodeURIComponent(slug)}`
  );
  return normalizeProject(response.project);
}
