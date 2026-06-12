import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { ProjectRenderer } from "../components/work/ProjectRenderer";
import { normalizeProjectContent } from "../components/work/blockTypes";
import { PagePreviewRenderer } from "../components/pages/PagePreviewRenderer";
import { PublicPageContent } from "./PublicPage";
import { Awards } from "../sections/Awards";
import { CTA } from "../sections/CTA";
import { FAQ } from "../sections/FAQ";
import { FeaturedWork } from "../sections/FeaturedWork";
import { Hero } from "../sections/Hero";
import { Services } from "../sections/Services";
import { Testimonials } from "../sections/Testimonials";
import { getPublicPreviewPage, type PublicPageDetail } from "../services/siteSettings";
import { PreviewTokenProvider } from "../site/PreviewTokenContext";
import { PublicSiteValueProvider } from "../site/PublicSiteContext";

type PreviewPageResponse = Awaited<ReturnType<typeof getPublicPreviewPage>>;

const processBlockTypes = new Set([
  "processHeroAtticSalt",
  "processMethodIntro",
  "processStepsAccordion",
  "processMediaPeekCarousel",
  "processCtaOutline",
]);

function PreviewBanner({
  page,
  expiresAt,
}: {
  page: string;
  expiresAt: string;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-24 z-[9500] w-[280px] max-w-[calc(100vw-2rem)] md:right-6 md:top-28">
      <div className="pointer-events-auto rounded-2xl border border-[#f4511e]/18 bg-[#15130f]/88 p-4 text-black shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f4511e]">
          Preview mode
        </p>
        <p className="mt-2 text-sm leading-relaxed text-black/88">
          Draft content for <span className="font-semibold text-black">{page}</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-black/58">
          Expires {new Date(expiresAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function HomePreviewContent({ token }: { token: string }) {
  return (
    <PreviewTokenProvider pageKey="home" token={token}>
      <div className="min-h-screen bg-black">
        <Hero />
        <Services />
        <FeaturedWork />
        <Awards />
        <Testimonials />
        <FAQ />
        <CTA />
      </div>
    </PreviewTokenProvider>
  );
}

export function PreviewPage() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const [searchParams] = useSearchParams();
  const [preview, setPreview] = useState<PreviewPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token") ?? "";

  useEffect(() => {
    if (!pageKey || !token) {
      setLoading(false);
      setError("Preview token is required.");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // The browser-facing /preview/pages/* route stays separate from the
        // token-gated backend API route used here for draft delivery.
        const response = await getPublicPreviewPage(pageKey!, token);
        if (!cancelled) {
          setPreview(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load preview.");
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
  }, [pageKey, token]);

  const normalizedBlocks = useMemo(
    () => normalizeProjectContent(preview?.page.content).blocks,
    [preview?.page.content]
  );
  const isProcessPreview = normalizedBlocks.some((block) => processBlockTypes.has(block.type));
  const useLegacyHomePreview = preview?.page.pageKey === "home" && normalizedBlocks.length === 0;
  const previewPage = useMemo<PublicPageDetail | null>(() => {
    if (!preview) {
      return null;
    }

    return {
      pageKey: preview.page.pageKey,
      title: preview.page.title,
      slug: preview.page.slug,
      seoTitle: preview.page.seoTitle,
      seoDescription: preview.page.seoDescription,
      status: preview.page.status,
      publishedAt: null,
      revisionNumber: preview.page.revisionNumber,
      hierarchy: preview.page.hierarchy,
      content: {
        blocks: normalizedBlocks,
      },
    };
  }, [normalizedBlocks, preview]);

  if (loading) {
    return <div className="min-h-screen bg-black px-6 py-16 text-sm text-white/60">Loading preview...</div>;
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen bg-black px-6 py-16 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Preview</p>
        <h1 className="mt-4 font-serif text-4xl">Preview unavailable</h1>
        <p className="mt-4 max-w-2xl text-white/65">{error ?? "The preview could not be loaded."}</p>
      </div>
    );
  }

  return (
    <>
      <PreviewBanner page={preview.page.pageKey} expiresAt={preview.preview.expiresAt} />
      {useLegacyHomePreview ? (
        <HomePreviewContent token={token} />
      ) : isProcessPreview ? (
        <div className="min-h-screen bg-black py-12 text-white">
          <div className="mx-auto w-full max-w-6xl px-6">
            <ProjectRenderer
              content={preview.page.content}
              blocks={normalizedBlocks}
              flushXOverride={false}
              stackClassName="space-y-0"
            />
          </div>
        </div>
      ) : previewPage && preview.presentation ? (
        <PublicSiteValueProvider presentation={preview.presentation}>
          <PublicPageContent page={previewPage} />
        </PublicSiteValueProvider>
      ) : (
        <PagePreviewRenderer title={preview.page.title} blocks={normalizedBlocks} />
      )}
    </>
  );
}
