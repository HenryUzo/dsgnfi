import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { PageBreadcrumbs } from "../components/pages/PageBreadcrumbs";
import { PageBlocksRenderer } from "../components/pages/PageBlocksRenderer";
import { BlitPageExperience, isBlitBlockType } from "../components/pages/blit/BlitPageExperience";
import { getPublicPageBySlug, type PublicPageDetail } from "../services/siteSettings";
import { NotFound } from "./NotFound";

export function PublicPageContent({ page }: { page: PublicPageDetail }) {
  const isImportedTemplatePage = page.content.blocks.some((block) => isBlitBlockType(block.type));

  if (isImportedTemplatePage) {
    return <BlitPageExperience page={page} blocks={page.content.blocks} />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PageBreadcrumbs page={page} />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="border-b border-white/10 pb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Published Page</p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">{page.title}</h1>
        </header>
        <PageBlocksRenderer blocks={page.content.blocks} />
      </div>
    </div>
  );
}

export function PublicPage() {
  const location = useLocation();
  const [page, setPage] = useState<PublicPageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const nextPage = await getPublicPageBySlug(location.pathname);
        if (!cancelled) {
          setPage(nextPage);
          if (nextPage.seoTitle || nextPage.title) {
            document.title = nextPage.seoTitle ?? nextPage.title;
          }
        }
      } catch (err) {
        if (!cancelled) {
          setPage(null);
          setError(err instanceof Error ? err.message : "Page not found.");
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
  }, [location.pathname, location.search]);

  if (loading) {
    return <div className="min-h-screen bg-black px-6 py-24 text-sm text-white/60">Loading page...</div>;
  }

  if (error || !page) {
    return <NotFound />;
  }

  return <PublicPageContent page={page} />;
}
