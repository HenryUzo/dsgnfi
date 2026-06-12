import { ProjectRenderer } from "../components/work/ProjectRenderer";
import { normalizeProjectContent } from "../components/work/blockTypes";
import { useProcessPublicContent } from "../hooks/useProcessPublicContent";

export function Process() {
  const { content, loading, error, isEmpty } = useProcessPublicContent();

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-12">
        {loading ? (
          <p className="text-sm text-white/60">Loading process...</p>
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : null}
      </div>

      {!loading && !error && isEmpty ? (
        <div className="mx-auto w-full max-w-4xl px-6 pt-16 text-center lg:px-12">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Process</p>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl">
            No published process content yet.
          </h1>
          <p className="mt-4 text-base text-white/60">
            This page will appear once the current site&apos;s process content has been
            published from the admin.
          </p>
        </div>
      ) : content ? (
        (() => {
          const blocks = normalizeProjectContent(content).blocks;
          const isAtticSalt = blocks.some((block) =>
            [
              "processHeroAtticSalt",
              "processMethodIntro",
              "processStepsAccordion",
              "processMediaPeekCarousel",
              "processCtaOutline",
            ].includes(block.type)
          );

          return (
            <ProjectRenderer
              content={content}
              blocks={blocks}
              stackClassName={isAtticSalt ? "space-y-0" : "space-y-10 md:space-y-14"}
              flushXOverride={false}
            />
          );
        })()
      ) : null}
    </div>
  );
}
