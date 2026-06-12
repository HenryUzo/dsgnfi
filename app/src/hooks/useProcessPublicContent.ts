import { useEffect, useState } from "react";

import type { ProjectContent } from "../components/work/blockTypes";
import { getProcessContent } from "../services/processPublic";

export function useProcessPublicContent() {
  const [content, setContent] = useState<ProjectContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getProcessContent();
        if (!cancelled) {
          setContent(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load process content.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    content,
    loading,
    error,
    isEmpty: !loading && !error && (!content || content.blocks.length === 0),
  };
}
