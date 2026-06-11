import { useCallback, useEffect, useState } from "react";

import type { ProjectContent } from "../components/work/blockTypes";
import { ApiError } from "../lib/api";
import { getProcessContent } from "../services/processAdmin";

export function useProcessAdminContent(siteId?: string | null) {
  const [content, setContent] = useState<ProjectContent>({ blocks: [] });
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);

    try {
      const response = await getProcessContent();
      setContent(response.data);
      setStatus(response.status);
      setPublishedAt(response.publishedAt);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load process content.";
      setError(message);
      setErrorStatus(err instanceof ApiError ? err.status : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setContent({ blocks: [] });
    setPublishedAt(null);
    setStatus("DRAFT");
    setError(null);
    setErrorStatus(null);
    void reload();
  }, [reload, siteId]);

  return {
    content,
    setContent,
    status,
    publishedAt,
    loading,
    error,
    errorStatus,
    setError,
    reload,
    isEmpty: content.blocks.length === 0,
  };
}
