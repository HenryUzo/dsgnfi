import { useEffect, useMemo, useState } from "react";

import {
  getWorkPublicMeta,
  getWorkPublicProjects,
  getWorkPublicTags,
  type WorkPublicMeta,
  type WorkPublicProject,
  type WorkPublicTag,
} from "../services/workPublic";

const defaultMeta: WorkPublicMeta = {
  title: "Work",
  subtitle: "Explore selected projects across strategy, branding, and digital.",
};

export function useWorkPublicCatalog() {
  const [meta, setMeta] = useState<WorkPublicMeta>(defaultMeta);
  const [tags, setTags] = useState<WorkPublicTag[]>([]);
  const [projects, setProjects] = useState<WorkPublicProject[]>([]);
  const [activeTagSlug, setActiveTagSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBase() {
      setLoading(true);
      setError(null);
      try {
        const [metaResult, tagsResult, projectsResult] = await Promise.all([
          getWorkPublicMeta(),
          getWorkPublicTags(),
          getWorkPublicProjects(),
        ]);

        if (!cancelled) {
          setMeta(metaResult);
          setTags(tagsResult);
          setProjects(projectsResult);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load work page.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadBase();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFilteredProjects() {
      try {
        const nextProjects = await getWorkPublicProjects(activeTagSlug ?? undefined);
        if (!cancelled) {
          setProjects(nextProjects);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to filter projects.";
          setError(message);
        }
      }
    }

    void loadFilteredProjects();

    return () => {
      cancelled = true;
    };
  }, [activeTagSlug]);

  const tagPills = useMemo(
    () => [{ id: "all", name: "All", slug: null as string | null }, ...tags],
    [tags]
  );

  return {
    meta,
    tags,
    tagPills,
    projects,
    activeTagSlug,
    setActiveTagSlug,
    loading,
    error,
  };
}
