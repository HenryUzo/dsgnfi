import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { PageBlocksRenderer } from "../../components/pages/PageBlocksRenderer";
import { getAdminTemplate, type TemplateDetail } from "../../services/adminSites";

export function TemplatePreviewPage() {
  const { templateKey } = useParams<{ templateKey: string }>();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplate() {
      if (!templateKey) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await getAdminTemplate(templateKey);
        if (!cancelled) {
          setTemplate(response);
        }
      } catch {
        if (!cancelled) {
          setTemplate(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTemplate();
    return () => {
      cancelled = true;
    };
  }, [templateKey]);

  const homePage = useMemo(
    () => template?.manifest.supportedPages?.find((page) => page.pageKey === "home") ?? null,
    [template]
  );

  if (loading) {
    return <div className="min-h-screen bg-black" />;
  }

  if (!template || !homePage) {
    return (
      <div className="min-h-screen bg-black px-10 py-12 text-white">
        <p className="text-sm text-white/55">Template preview unavailable.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/85 px-10 py-5 backdrop-blur">
        <div className="flex items-center justify-between gap-8">
          <p className="text-sm font-semibold">{template.name}</p>
          <nav className="flex gap-5 text-xs uppercase tracking-[0.2em] text-white/55">
            {(template.manifest.starterNavigation?.primary ?? []).slice(0, 4).map((item) => {
              const label = typeof item === "string" ? item : item.label;
              return <span key={label}>{label}</span>;
            })}
          </nav>
        </div>
      </header>
      <main className="px-10 py-12">
        <div className="w-full">
          <PageBlocksRenderer blocks={homePage.defaultBlocks} />
        </div>
      </main>
    </div>
  );
}
