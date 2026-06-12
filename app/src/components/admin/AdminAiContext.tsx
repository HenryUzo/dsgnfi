import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AdminAiPageContext = {
  pageEditor?: {
    pageKey?: string | null;
    title?: string | null;
    slug?: string | null;
    pageTemplateKey?: string | null;
    allowedBlockTypes?: string[];
    blockTypes?: string[];
  } | null;
};

type AdminAiContextValue = {
  pageContext: AdminAiPageContext | null;
  setPageContext: (context: AdminAiPageContext | null) => void;
};

const AdminAiContext = createContext<AdminAiContextValue | null>(null);

export function AdminAiContextProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContextState] = useState<AdminAiPageContext | null>(null);

  const setPageContext = useCallback((context: AdminAiPageContext | null) => {
    setPageContextState(context);
  }, []);

  const value = useMemo(
    () => ({ pageContext, setPageContext }),
    [pageContext, setPageContext]
  );

  return <AdminAiContext.Provider value={value}>{children}</AdminAiContext.Provider>;
}

export function useAdminAiRegisteredContext() {
  return useContext(AdminAiContext)?.pageContext ?? null;
}

export function useAdminAiPageContext(context: AdminAiPageContext | null) {
  const registry = useContext(AdminAiContext);
  const setPageContext = registry?.setPageContext;
  const contextKey = useMemo(() => JSON.stringify(context ?? null), [context]);

  useEffect(() => {
    if (!setPageContext) {
      return undefined;
    }

    setPageContext(context);
    return () => setPageContext(null);
    // contextKey prevents repeated updates when callers pass equivalent inline objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, setPageContext]);
}
