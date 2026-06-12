import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { apiFetch } from "../lib/api";
import { usePreviewToken } from "../site/PreviewTokenContext";

export type CmsSectionResponse<T> = {
  page: string;
  section: string;
  data: T | null;
};

export type CmsSectionState = "loading" | "ready" | "empty" | "error";

export function useCmsSection<T = unknown>(
  page: string,
  section: string,
  fallbackData: T | null = null,
  pollMs = 15000
) {
  const location = useLocation();
  const preview = usePreviewToken();
  const [data, setData] = useState<T | null>(fallbackData);
  const [status, setStatus] = useState<CmsSectionState>("loading");
  const [error, setError] = useState<string | null>(null);
  const fallbackRef = useRef<T | null>(fallbackData);

  const requestPath = useMemo(() => {
    const query = new URLSearchParams({
      page,
      section,
    });

    if (preview?.token && preview.pageKey === page) {
      query.set("token", preview.token);
      return `/public/preview/cms/section?${query.toString()}`;
    }

    return `/public/cms/section?${query.toString()}`;
  }, [page, preview?.pageKey, preview?.token, section]);

  useEffect(() => {
    fallbackRef.current = fallbackData;
  }, [fallbackData]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function load(showLoading = false) {
      if (showLoading) {
        setStatus("loading");
      }
      setError(null);

      try {
        const response = await apiFetch<CmsSectionResponse<T>>(requestPath);

        if (!cancelled) {
          setData(response.data);
          setStatus(response.data === null ? "empty" : "ready");
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Request failed";
          setError(message);
          setStatus("error");
        }
      }
    }

    if (page && section) {
      void load(true);
      if (pollMs > 0) {
        intervalId = window.setInterval(() => {
          void load(false);
        }, pollMs);
      }
    } else {
      setStatus("empty");
      setData(null);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [location.search, page, pollMs, requestPath, section]);

  useEffect(() => {
    const onFocus = () => {
      if (!page || !section) return;

      void (async () => {
        try {
          const response = await apiFetch<CmsSectionResponse<T>>(requestPath);
          setError(null);
          setData(response.data);
          setStatus(response.data === null ? "empty" : "ready");
        } catch (err) {
          const message = err instanceof Error ? err.message : "Request failed";
          setError(message);
          setStatus("error");
        }
      })();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location.search, page, requestPath, section]);

  return {
    data,
    loading: status === "loading",
    error,
    status,
    isEmpty: status === "empty",
    fallbackData: fallbackRef.current,
  };
}
