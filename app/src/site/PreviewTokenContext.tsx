import { createContext, useContext, type ReactNode } from "react";

type PreviewTokenContextValue = {
  pageKey: string;
  token: string;
};

const PreviewTokenContext = createContext<PreviewTokenContextValue | null>(null);

export function PreviewTokenProvider({
  pageKey,
  token,
  children,
}: {
  pageKey: string;
  token: string;
  children: ReactNode;
}) {
  return (
    <PreviewTokenContext.Provider value={{ pageKey, token }}>
      {children}
    </PreviewTokenContext.Provider>
  );
}

export function usePreviewToken() {
  return useContext(PreviewTokenContext);
}
