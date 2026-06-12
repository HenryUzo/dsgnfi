import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

import { getPublicSite, type SitePresentation } from "../services/siteSettings";

type PublicSiteContextValue = {
  presentation: SitePresentation | null;
  loading: boolean;
  error: string | null;
};

const PublicSiteContext = createContext<PublicSiteContextValue | null>(null);

export function PublicSiteValueProvider({
  presentation,
  children,
}: {
  presentation: SitePresentation | null;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      presentation,
      loading: false,
      error: presentation ? null : "Site not found.",
    }),
    [presentation]
  );

  return <PublicSiteContext.Provider value={value}>{children}</PublicSiteContext.Provider>;
}

export function PublicSiteProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [presentation, setPresentation] = useState<SitePresentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const nextSite = await getPublicSite();
        if (!cancelled) {
          setPresentation(nextSite);
        }
      } catch (err) {
        if (!cancelled) {
          setPresentation(null);
          setError(err instanceof Error ? err.message : "Failed to load site.");
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
  }, [location.search]);

  const value = useMemo(
    () => ({
      presentation,
      loading,
      error,
    }),
    [presentation, loading, error]
  );

  return <PublicSiteContext.Provider value={value}>{children}</PublicSiteContext.Provider>;
}

export function usePublicSite() {
  const context = useContext(PublicSiteContext);

  if (!context) {
    throw new Error("usePublicSite must be used within a PublicSiteProvider.");
  }

  return context;
}

export function useOptionalPublicSite() {
  return useContext(PublicSiteContext);
}
