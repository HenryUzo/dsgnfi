import { useEffect, useRef, useState, type ReactNode } from "react";

export type RenderablePageBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readObjectArray<T extends Record<string, unknown>>(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is T => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isVideoSource(value: string) {
  return /\.mp4(\?|$)/i.test(value);
}

function splitParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitBlitContactHeading(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || value.trim().toLowerCase() === "contact") {
    return { lead: "start a", accent: "project" };
  }

  if (words.length <= 1) {
    return { lead: value, accent: "" };
  }

  return {
    lead: words.slice(0, -1).join(" "),
    accent: words[words.length - 1] ?? "",
  };
}

function collectImageUrls(value: unknown, urls: string[] = []) {
  if (typeof value === "string") {
    if (/\.(avif|gif|jpe?g|png|webp)(\?|$)/i.test(value) && !urls.includes(value)) {
      urls.push(value);
    }
    return urls;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectImageUrls(entry, urls));
    return urls;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectImageUrls(entry, urls));
  }

  return urls;
}

function BlitShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-[#f5f2ea] px-6 py-[84px] text-[#111] ${className}`}>
      {children}
    </section>
  );
}

function BlitLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.26em] text-[#111]/60">
      <span className="h-2 w-2 rounded-full bg-[#f15a24]" />
      {children}
    </p>
  );
}

function getBlitPreviewProjectLabels(project: Record<string, unknown>) {
  const labels = readStringArray(project.labels);
  if (labels.length > 0) {
    return labels;
  }

  return readString(project.category)
    .replace(/\u00c2/g, "")
    .split(/\s*(?:\u00b7|\/|\||,)\s*/)
    .map((label) => label.trim())
    .filter(Boolean);
}

function BlitProjectGrid({
  projects,
}: {
  projects: Array<Record<string, unknown>>;
}) {
  return (
    <div className="overflow-hidden bg-[#f5f2ea] text-[#15130f]">
      {projects.map((project, index) => (
        <article
          key={`${readString(project.id) || index}`}
          className="grid gap-5 border-t border-black/10 p-5 md:grid-cols-[minmax(0,0.9fr)_minmax(280px,1.1fr)] md:items-center md:p-6"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-black/38">
              <span>{String(index + 1).padStart(2, "0")}</span>
              {readString(project.year) ? <span>{readString(project.year)}</span> : null}
            </div>
            <h3 className="font-serif text-4xl leading-[0.9] tracking-[-0.06em] text-[#15130f] md:text-5xl">
              {readString(project.title) || `Project ${index + 1}`}
            </h3>
            <div className="flex flex-wrap gap-2">
              {getBlitPreviewProjectLabels(project).map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-black/12 bg-white/45 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-black/55"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="h-64 overflow-hidden bg-black/10 md:h-80">
            {readString(project.image) ? (
              <img
                src={readString(project.image)}
                alt={readString(project.title) || `Project ${index + 1}`}
                className="h-full w-full object-cover grayscale"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.24em] text-black/30">
                No image
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function BlitPreviewMedia({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  if (!src) {
    return <div className={`bg-black/10 ${className}`} />;
  }

  if (isVideoSource(src)) {
    return <video src={src} autoPlay loop muted playsInline className={className} />;
  }

  return <img src={src} alt={alt} className={className} />;
}

function chunkProjects(projects: Array<Record<string, unknown>>, size: number) {
  const chunks: Array<Array<Record<string, unknown>>> = [];
  for (let index = 0; index < projects.length; index += size) {
    chunks.push(projects.slice(index, index + size));
  }
  return chunks;
}

function BlitPreviewFeaturedCarousel({
  eyebrow,
  title,
  ctaLabel,
  projects,
}: {
  eyebrow: string;
  title: string;
  ctaLabel: string;
  projects: Array<Record<string, unknown>>;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateVisibleCount = () => {
      const width = node.getBoundingClientRect().width;
      const nextVisible = Math.max(1, Math.floor((width + 32) / 432));
      setVisibleCount(nextVisible);
    };

    const observer = new ResizeObserver(() => updateVisibleCount());
    observer.observe(node);
    updateVisibleCount();

    return () => observer.disconnect();
  }, []);

  const pages = chunkProjects(projects, visibleCount);
  const currentProjects = pages[page] ?? [];
  const hasOverflow = pages.length > 1;

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(pages.length - 1, 0)));
  }, [pages.length]);

  return (
    <div ref={viewportRef} className="space-y-6">
      <BlitLabel>{eyebrow}</BlitLabel>
      <div className="mb-16 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <h2 className="max-w-4xl font-serif text-4xl leading-tight tracking-[-0.04em] md:text-6xl">
          {title}
        </h2>
        <span className="inline-flex w-fit items-center gap-3 rounded-full border border-black/20 px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#15130f]">
          {ctaLabel}
          <span aria-hidden="true">/</span>
        </span>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        {currentProjects.map((project, index) => (
          <article key={`${readString(project.id) || index}`} className="w-full max-w-[400px] overflow-hidden rounded-3xl border border-black/10 bg-white/55">
            {readString(project.image) ? (
              <img
                src={readString(project.image)}
                alt={readString(project.title) || `Project ${index + 1}`}
                className="h-56 w-full object-cover grayscale"
              />
            ) : null}
            <div className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#f15a24]">
                {readString(project.category)} {readString(project.year) ? `/ ${readString(project.year)}` : ""}
              </p>
              <h3 className="font-serif text-3xl text-[#111]">{readString(project.title)}</h3>
              <p className="text-sm leading-relaxed text-[#111]/65">{readString(project.description)}</p>
            </div>
          </article>
        ))}
      </div>
      {hasOverflow ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {pages.map((_, index) => (
              <button
                key={`preview-featured-indicator-${index}`}
                type="button"
                onClick={() => setPage(index)}
                className={`h-2.5 rounded-full transition ${
                  page === index ? "w-10 bg-[#15130f]" : "w-2.5 bg-black/20 hover:bg-black/35"
                }`}
                aria-label={`Show featured work page ${index + 1}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
              disabled={page === 0}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-black/20 text-lg text-[#15130f] transition hover:border-[#15130f] hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Previous featured projects"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, pages.length - 1))}
              disabled={page === pages.length - 1}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-black/20 text-lg text-[#15130f] transition hover:border-[#15130f] hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Next featured projects"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PageBlocksRenderer({ blocks }: { blocks: RenderablePageBlock[] }) {
  return (
    <>
      {blocks.map((block) => {
        if (block.data.hidden === true) {
          return null;
        }

        switch (block.type) {
          case "blitHeroCollage": {
            const images = readObjectArray<{ imageUrl?: unknown; alt?: unknown }>(block.data.images);
            return (
              <BlitShell key={block.id} className="flex min-h-[90vh] items-center overflow-hidden">
                <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
                  <div>
                    <BlitLabel>{readString(block.data.eyebrow) || "Blit Studio"}</BlitLabel>
                    <h2 className="font-serif text-5xl leading-[0.9] tracking-[-0.06em] md:text-7xl">
                      {readString(block.data.headline)}
                    </h2>
                    <p className="mt-6 max-w-xl text-base leading-relaxed text-[#111]/65">
                      {readString(block.data.caption)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {images.map((image, index) => (
                      <img
                        key={`${block.id}-image-${index}`}
                        src={readString(image.imageUrl)}
                        alt={readString(image.alt) || `Blit collage ${index + 1}`}
                        className={`h-48 w-full rounded-[1.5rem] object-cover grayscale ${index === 1 ? "mt-10" : index === 2 ? "mt-20" : ""}`}
                      />
                    ))}
                  </div>
                </div>
              </BlitShell>
            );
          }
          case "blitFeaturedWork":
            return (
              <BlitShell key={block.id}>
                <BlitPreviewFeaturedCarousel
                  eyebrow={readString(block.data.heading) || "featured work"}
                  title={readString(block.data.title) || "Selected projects"}
                  ctaLabel={readString(block.data.ctaLabel) || "See all projects"}
                  projects={readObjectArray(block.data.projects)}
                />
              </BlitShell>
            );
          case "blitEditorialStatement":
          case "blitPhilosophy":
            return (
              <BlitShell key={block.id}>
                <BlitLabel>{readString(block.data.eyebrow) || readString(block.data.heading) || "statement"}</BlitLabel>
                <h2 className="max-w-4xl font-serif text-4xl leading-tight tracking-[-0.04em] md:text-6xl">
                  {readString(block.data.title) || readString(block.data.heading)}
                </h2>
                <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#111]/68">
                  {readString(block.data.body)}
                </p>
              </BlitShell>
            );
          case "blitVideoSection":
          case "blitUnfoldedHero":
            return (
              <BlitShell key={block.id} className="bg-[#111] px-0 text-white">
                {readString(block.data.videoUrl) ? (
                  <video
                    src={readString(block.data.videoUrl)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-[54vh] w-full object-cover"
                  />
                ) : null}
                <div className="p-8">
                  <BlitLabel>{readString(block.data.title) || "video"}</BlitLabel>
                  <p className="max-w-2xl text-white/65">{readString(block.data.subtitle)}</p>
                </div>
              </BlitShell>
            );
          case "blitCapabilitiesGrid":
            {
              const capabilities = readObjectArray<{
                title?: unknown;
                description?: unknown;
                imageUrl?: unknown;
                imageAlt?: unknown;
              }>(block.data.items);
              const firstCapability = capabilities[0] ?? {};
              const blockFallbackImage = readString(block.data.imageUrl);
              const pageImageUrls = collectImageUrls(blocks).filter((url) => url !== blockFallbackImage);
              const fallbackImages = [blockFallbackImage, ...pageImageUrls].filter(Boolean);
              const previewImage =
                readString(firstCapability.imageUrl) || fallbackImages[0] || "";
              const previewTitle = readString(firstCapability.title);
              const previewDescription = readString(firstCapability.description);

              return (
                <BlitShell key={block.id}>
                  <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                    <div>
                      <BlitLabel>{readString(block.data.heading) || "capabilities"}</BlitLabel>
                      <div className="space-y-3">
                        {capabilities.map((item, index) => (
                          <div
                            key={`${block.id}-capability-title-${index}`}
                            className={`border-t border-black/10 py-4 ${
                              index === 0 ? "text-[#111]" : "text-[#111]/35"
                            }`}
                          >
                            <p className="font-serif text-3xl leading-none md:text-5xl">
                              {readString(item.title)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="overflow-hidden rounded-[10px] bg-black/10">
                        {previewImage ? (
                          <img
                            src={previewImage}
                            alt={readString(firstCapability.imageAlt) || previewTitle || "Capabilities"}
                            className="h-[420px] w-full object-cover grayscale"
                          />
                        ) : null}
                      </div>
                      <div className="mt-4 rounded-[10px] bg-white p-5">
                        <h3 className="text-xl font-bold">{previewTitle}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-[#111]/65">
                          {previewDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                </BlitShell>
              );
            }
          case "blitHorizontalGallery":
          case "blitOriginals":
            return (
              <BlitShell key={block.id}>
                <BlitLabel>{readString(block.data.heading) || "gallery"}</BlitLabel>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {readObjectArray<{ image?: unknown; title?: unknown; subtitle?: unknown }>(block.data.projects).map((project, index) => (
                    <article key={`${block.id}-gallery-${index}`} className="min-w-[260px] overflow-hidden rounded-3xl border border-black/10 bg-white/60">
                      {readString(project.image) ? (
                        <img src={readString(project.image)} alt={readString(project.title)} className="h-64 w-full object-cover grayscale" />
                      ) : null}
                      <div className="p-4">
                        <h3 className="font-serif text-2xl">{readString(project.title)}</h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#111]/50">{readString(project.subtitle)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </BlitShell>
            );
          case "blitFinalStatement":
            return (
              <BlitShell key={block.id} className="bg-[#f15a24] text-black">
                <h2 className="font-serif text-5xl leading-none tracking-[-0.06em] md:text-7xl">
                  {readString(block.data.title)}
                </h2>
              </BlitShell>
            );
          case "blitCaseStudyHero": {
            const introParagraphs = splitParagraphs(readString(block.data.introBody));
            return (
              <BlitShell key={block.id}>
                <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
                  <div>
                    <BlitLabel>{readString(block.data.eyebrow) || "work"}</BlitLabel>
                    <h2 className="font-serif text-5xl leading-[0.9] tracking-[-0.06em] md:text-7xl">
                      {readString(block.data.title)}
                    </h2>
                    <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-[#111]/55">
                      {[readString(block.data.year), readString(block.data.category), readString(block.data.location)]
                        .filter(Boolean)
                        .map((item) => (
                          <span key={`${block.id}-${item}`}>{item}</span>
                        ))}
                    </div>
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#111]/68">
                      {readString(block.data.summary)}
                    </p>
                  </div>
                  <BlitPreviewMedia
                    src={readString(block.data.primaryMediaUrl)}
                    alt={readString(block.data.title) || "Case study hero media"}
                    className="h-[54vh] w-full object-cover grayscale"
                  />
                </div>
                {readString(block.data.secondaryMediaUrl) ? (
                  <div className="mt-8 space-y-6">
                    <BlitPreviewMedia
                      src={readString(block.data.secondaryMediaUrl)}
                      alt={`${readString(block.data.title) || "Case study"} detail`}
                      className="h-[42vh] w-full object-cover grayscale"
                    />
                    {introParagraphs.length > 0 ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {introParagraphs.map((paragraph, index) => (
                          <p key={`${block.id}-intro-${index}`} className="text-sm leading-relaxed text-[#111]/68">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </BlitShell>
            );
          }
          case "blitCaseStudyHighlights": {
            const stories = readObjectArray<{ title?: unknown; body?: unknown }>(block.data.stories);
            const media = readObjectArray<{ src?: unknown; alt?: unknown }>(block.data.media);
            return (
              <BlitShell key={block.id}>
                <div className="grid gap-6 md:grid-cols-2">
                  {stories.slice(0, 2).map((story, index) => (
                    <article key={`${block.id}-lead-${index}`} className="border-t border-black/10 pt-4">
                      <h3 className="font-serif text-3xl">{readString(story.title)}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-[#111]/65">{readString(story.body)}</p>
                    </article>
                  ))}
                </div>
                {media.length > 0 ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {media.map((item, index) => (
                      <BlitPreviewMedia
                        key={`${block.id}-media-${index}`}
                        src={readString(item.src)}
                        alt={readString(item.alt) || `Case study media ${index + 1}`}
                        className="h-56 w-full object-cover grayscale"
                      />
                    ))}
                  </div>
                ) : null}
                {stories.length > 2 ? (
                  <div className="mt-6 grid gap-6 md:grid-cols-3">
                    {stories.slice(2).map((story, index) => (
                      <article key={`${block.id}-trail-${index}`} className="border-t border-black/10 pt-4">
                        <h3 className="font-serif text-2xl">{readString(story.title)}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-[#111]/65">{readString(story.body)}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </BlitShell>
            );
          }
          case "blitCaseStudyTechnical":
            return (
              <BlitShell key={block.id}>
                <BlitLabel>{readString(block.data.heading) || "system logic"}</BlitLabel>
                <div className="grid gap-4 lg:grid-cols-2">
                  {readStringArray(block.data.paragraphs).map((paragraph, index) => (
                    <p key={`${block.id}-paragraph-${index}`} className="text-sm leading-relaxed text-[#111]/68">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {readObjectArray<{ src?: unknown; alt?: unknown }>(block.data.media).map((item, index) => (
                    <BlitPreviewMedia
                      key={`${block.id}-tech-media-${index}`}
                      src={readString(item.src)}
                      alt={readString(item.alt) || `Technical media ${index + 1}`}
                      className="h-56 w-full object-cover grayscale"
                    />
                  ))}
                </div>
              </BlitShell>
            );
          case "blitCaseStudyCredits":
            return (
              <BlitShell key={block.id}>
                <BlitLabel>{readString(block.data.heading) || "the blit. team"}</BlitLabel>
                <p className="font-serif text-4xl leading-tight tracking-[-0.05em] md:text-5xl">
                  {readStringArray(block.data.team).join(" / ")}
                </p>
              </BlitShell>
            );
          case "blitWorksIndex":
            return (
              <BlitShell key={block.id} className="bg-[#f5f2ea] text-[#15130f]">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-6">
                  <div>
                    <p className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-black/48">
                      <span className="h-2 w-2 rounded-full bg-[#f15a24]" />
                      {readString(block.data.eyebrow) || "selected works"}
                    </p>
                    <h2 className="font-serif text-7xl leading-[0.82] tracking-[-0.08em] text-[#15130f]">
                      {readString(block.data.heading) || "works"}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {readStringArray(block.data.filters).map((filter) => (
                      <span key={filter} className="rounded-full border border-black/12 bg-white/45 px-3 py-1 text-xs uppercase tracking-[0.16em] text-black/50">
                        {filter}
                      </span>
                    ))}
                  </div>
                </div>
                <BlitProjectGrid projects={readObjectArray(block.data.projects)} />
              </BlitShell>
            );
          case "blitStudioHero":
            return (
              <BlitShell key={block.id}>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
                  <div>
                    <BlitLabel>Blit Studio</BlitLabel>
                    <h2 className="font-serif text-6xl tracking-[-0.06em] md:text-8xl">{readString(block.data.title)}</h2>
                    <p className="mt-5 max-w-2xl text-lg text-[#111]/65">{readString(block.data.subtitle)}</p>
                  </div>
                  {readString(block.data.imageUrl) ? (
                    <img src={readString(block.data.imageUrl)} alt={readString(block.data.title)} className="h-72 rounded-3xl object-cover grayscale" />
                  ) : null}
                </div>
              </BlitShell>
            );
          case "blitContactHero": {
            const heading = splitBlitContactHeading(readString(block.data.title) || "start a project");
            return (
              <BlitShell key={block.id} className="text-center">
                <h2
                  className="mx-auto max-w-5xl font-serif text-[13vw] leading-[0.86] tracking-normal text-[#15130f] md:text-8xl"
                  aria-label={[heading.lead, heading.accent].filter(Boolean).join(" ")}
                >
                  <span className="block">{heading.lead}</span>
                  {heading.accent ? <em className="block italic">{heading.accent}</em> : null}
                </h2>
                {readString(block.data.formIntro) || readString(block.data.subtitle) ? (
                  <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-[#111]/60">
                    {readString(block.data.formIntro) || readString(block.data.subtitle)}
                  </p>
                ) : null}
                <div className="mx-auto mt-10 w-full max-w-[512px] text-left">
                  <div className="grid grid-cols-2 gap-6">
                    {["First Name", "Last Name"].map((label) => (
                      <div key={label}>
                        <p className="text-sm">{label}</p>
                        <div className="mt-7 border-b border-black/35" />
                      </div>
                    ))}
                  </div>
                  {["Email *", "Company Name *", "Job Title", "Tell Us More About The Project *"].map((label, index) => (
                    <div key={label} className="mt-9">
                      <p className="text-sm">{label}</p>
                      <div className={`${index === 3 ? "mt-20" : "mt-7"} border-b border-black/35`} />
                    </div>
                  ))}
                  <div className="mt-7 rounded-full bg-[#15130f] px-8 py-4 text-center text-sm font-semibold text-[#f5f2ea]">
                    {readString(block.data.submitLabel) || "Send Message"}
                  </div>
                </div>
              </BlitShell>
            );
          }
          case "blitStudioIntro":
            return (
              <BlitShell key={block.id} className="bg-[#111] text-white">
                <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
                  <BlitLabel>{readString(block.data.kicker) || "studio"}</BlitLabel>
                  <p className="max-w-xl text-2xl leading-tight md:text-4xl">{readString(block.data.body)}</p>
                </div>
              </BlitShell>
            );
          case "blitFormatStatement":
            return (
              <BlitShell key={block.id}>
                <div className="grid gap-8 md:grid-cols-[0.8fr_1fr] md:items-center">
                  {readString(block.data.imageUrl) ? (
                    <BlitPreviewMedia src={readString(block.data.imageUrl)} alt={readString(block.data.title)} className="h-80 rounded-[2rem]" />
                  ) : null}
                  <div>
                    <h2 className="font-serif text-5xl leading-none tracking-[-0.06em] md:text-7xl">{readString(block.data.title)}</h2>
                    <p className="mt-6 max-w-lg text-lg text-[#111]/65">{readString(block.data.body)}</p>
                  </div>
                </div>
              </BlitShell>
            );
          case "blitStudioImageStatement":
            return (
              <BlitShell key={block.id}>
                <div className="grid gap-6">
                  {readString(block.data.imageUrl) ? (
                    <BlitPreviewMedia src={readString(block.data.imageUrl)} alt={readString(block.data.title)} className="h-[420px]" />
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-[1fr_0.45fr] md:items-start">
                    <h2 className="font-serif text-4xl leading-tight tracking-[-0.04em] md:text-6xl">{readString(block.data.title)}</h2>
                    <p className="text-sm text-[#111]/60">{readString(block.data.caption)}</p>
                  </div>
                </div>
              </BlitShell>
            );
          case "blitTeamStatement":
            return (
              <BlitShell key={block.id}>
                <h2 className="max-w-5xl font-serif text-5xl leading-none tracking-[-0.06em] md:text-7xl">{readString(block.data.title)}</h2>
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {readObjectArray<{ imageUrl?: unknown; name?: unknown; role?: unknown }>(block.data.people).map((person, index) => (
                    <article key={`${block.id}-person-${index}`} className="rounded-3xl border border-black/10 bg-white/60 p-3">
                      {readString(person.imageUrl) ? (
                        <BlitPreviewMedia src={readString(person.imageUrl)} alt={readString(person.name)} className="h-64 rounded-2xl" />
                      ) : null}
                      <p className="mt-3 font-bold">{readString(person.name)}</p>
                      <p className="text-sm text-[#111]/55">{readString(person.role)}</p>
                    </article>
                  ))}
                </div>
              </BlitShell>
            );
          case "blitAwards":
            return (
              <BlitShell key={block.id}>
                <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-end">
                  <div>
                    <BlitLabel>awards</BlitLabel>
                    <h2 className="font-serif text-4xl tracking-[-0.05em] md:text-6xl">{readString(block.data.heading)}</h2>
                    <p className="mt-5 text-lg text-[#111]/65">{readString(block.data.body)}</p>
                    <p className="mt-4 text-sm text-[#111]/50">{readString(block.data.secondaryBody)}</p>
                  </div>
                  {readString(block.data.imageUrl) ? (
                    <BlitPreviewMedia src={readString(block.data.imageUrl)} alt={readString(block.data.heading)} className="h-80 rounded-[2rem]" />
                  ) : null}
                </div>
              </BlitShell>
            );
          case "blitVideoQuote":
            return (
              <BlitShell key={block.id} className="bg-[#050505] text-white">
                {readString(block.data.videoUrl) ? (
                  <BlitPreviewMedia src={readString(block.data.videoUrl)} alt={readString(block.data.quote)} className="mb-10 h-80 border border-white/20" />
                ) : null}
                <BlitLabel>{readString(block.data.kicker) || "and because we know"}</BlitLabel>
                <h2 className="max-w-4xl font-serif text-4xl leading-tight tracking-[-0.05em] md:text-6xl">{readString(block.data.quote)}</h2>
                <p className="mt-6 max-w-lg text-white/60">{readString(block.data.body)}</p>
                <p className="mt-10 text-2xl text-[#ff3d00]">{readString(block.data.ctaLabel) || "let's talk"}</p>
              </BlitShell>
            );
          case "blitCareers":
            return (
              <BlitShell key={block.id} className="bg-[#ff3d00] text-black">
                <h2 className="font-serif text-6xl tracking-[-0.06em]">{readString(block.data.title) || "Careers"}</h2>
                <p className="mt-6 max-w-md text-xl leading-tight">{readString(block.data.body)}</p>
                <div className="mt-8 border-t border-black/30">
                  {readObjectArray<{ title?: unknown; type?: unknown }>(block.data.jobs).map((job, index) => (
                    <div key={`${block.id}-job-${index}`} className="flex items-center justify-between border-b border-black/30 py-3 text-sm">
                      <span>{readString(job.title)}</span>
                      <span>{readString(job.type)}</span>
                    </div>
                  ))}
                </div>
              </BlitShell>
            );
          case "blitManifesto":
            return (
              <BlitShell key={block.id}>
                <BlitLabel>{readString(block.data.heading) || "manifesto"}</BlitLabel>
                <div className="grid gap-3">
                  {readStringArray(block.data.items).map((item, index) => (
                    <p key={`${block.id}-manifesto-${index}`} className="rounded-2xl border border-black/10 bg-white/50 p-5 font-serif text-3xl">
                      {String(index + 1).padStart(2, "0")} / {item}
                    </p>
                  ))}
                </div>
              </BlitShell>
            );
          case "blitContactGrid":
            if (blocks.some((entry) => entry.type === "blitContactHero")) {
              return null;
            }

            return (
              <BlitShell key={block.id}>
                <div className="grid gap-6 md:grid-cols-3">
                  {readObjectArray<{ title?: unknown; contacts?: unknown }>(block.data.groups).map((group, index) => (
                    <div key={`${block.id}-group-${index}`}>
                      <BlitLabel>{readString(group.title)}</BlitLabel>
                      <div className="space-y-4">
                        {readObjectArray<{ name?: unknown; role?: unknown; email?: unknown; phone?: unknown }>(group.contacts).map((contact, contactIndex) => (
                          <div key={`${block.id}-contact-${index}-${contactIndex}`} className="rounded-2xl border border-black/10 bg-white/55 p-4">
                            <p className="font-bold">{readString(contact.name)}</p>
                            <p className="text-sm text-[#111]/55">{readString(contact.role)}</p>
                            <p className="mt-2 text-sm underline">{readString(contact.email)}</p>
                            <p className="text-sm text-[#111]/55">{readString(contact.phone)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </BlitShell>
            );
          case "blitOffices":
            if (blocks.some((entry) => entry.type === "blitContactHero")) {
              return null;
            }

            return (
              <BlitShell key={block.id}>
                <BlitLabel>{readString(block.data.heading) || "offices"}</BlitLabel>
                <div className="grid gap-4 md:grid-cols-2">
                  {readObjectArray<{ name?: unknown; phone?: unknown; address?: unknown; mapUrl?: unknown }>(block.data.offices).map((office, index) => (
                    <div key={`${block.id}-office-${index}`} className="rounded-2xl border border-black/10 bg-white/55 p-5">
                      <h3 className="font-serif text-3xl">{readString(office.name)}</h3>
                      <p className="mt-3 text-sm text-[#111]/65">{readString(office.phone)}</p>
                      <p className="text-sm text-[#111]/65">{readString(office.address)}</p>
                    </div>
                  ))}
                </div>
              </BlitShell>
            );
          case "blitArticleGrid":
            return (
              <BlitShell key={block.id}>
                <BlitLabel>{readString(block.data.heading) || "articles"}</BlitLabel>
                <div className="grid gap-4 md:grid-cols-3">
                  {readObjectArray<{ image?: unknown; title?: unknown; date?: unknown }>(block.data.articles).map((article, index) => (
                    <article key={`${block.id}-article-${index}`} className="overflow-hidden rounded-3xl border border-black/10 bg-white/60">
                      {readString(article.image) ? (
                        <img src={readString(article.image)} alt={readString(article.title)} className="h-52 w-full object-cover grayscale" />
                      ) : null}
                      <div className="p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#f15a24]">{readString(article.date)}</p>
                        <h3 className="mt-2 font-serif text-2xl">{readString(article.title)}</h3>
                      </div>
                    </article>
                  ))}
                </div>
              </BlitShell>
            );
          case "hero":
            return (
              <section key={block.id} className="rounded-3xl border border-white/10 bg-white/5 p-8">
                {readString(block.data.backgroundImage) ? (
                  <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                    <img
                      src={readString(block.data.backgroundImage)}
                      alt={readString(block.data.backgroundImageAlt) || readString(block.data.headline) || "Hero image"}
                      className="h-56 w-full object-cover"
                    />
                  </div>
                ) : null}
                <p className="text-sm uppercase tracking-[0.24em] text-white/45">Hero</p>
                <h2 className="mt-4 font-serif text-4xl">
                  {readString(block.data.headline) || readString(block.data.title) || "Untitled hero"}
                </h2>
                <p className="mt-4 max-w-3xl text-white/65">
                  {readString(block.data.subheadline) || readString(block.data.body)}
                </p>
                {readString(block.data.primaryCtaLabel) ? (
                  <div className="mt-6">
                    <span className="inline-flex rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75">
                      {readString(block.data.primaryCtaLabel)}
                    </span>
                  </div>
                ) : null}
              </section>
            );
          case "richText":
            return (
              <section key={block.id} className="prose prose-invert max-w-none rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="font-serif text-3xl">
                  {readString(block.data.title) || "Rich text"}
                </h2>
                <p className="text-white/70">
                  {readString(block.data.body) || readString(block.data.text)}
                </p>
              </section>
            );
          case "features":
            return (
              <section key={block.id} className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="font-serif text-3xl">
                  {readString(block.data.title) || readString(block.data.heading) || "Features"}
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {readObjectArray<{ title?: unknown; description?: unknown }>(block.data.items).map((item, index) => (
                    <div key={`${block.id}-${index}`} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/75">
                      <p className="font-medium text-white">{readString(item.title) || `Feature ${index + 1}`}</p>
                      <p className="mt-2 text-sm text-white/60">{readString(item.description)}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          case "faq":
            return (
              <section key={block.id} className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="font-serif text-3xl">
                  {readString(block.data.title) || readString(block.data.heading) || "FAQ"}
                </h2>
                <div className="mt-5 space-y-4">
                  {readObjectArray<{ question?: unknown; answer?: unknown }>(block.data.items).map((item, index) => (
                    <div key={`${block.id}-${index}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <p className="font-medium text-white">{readString(item.question) || `Question ${index + 1}`}</p>
                      <p className="mt-2 text-sm text-white/60">{readString(item.answer)}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          case "cta":
            return (
              <section key={block.id} className="rounded-3xl border border-[var(--brand)] bg-[color:rgba(255,255,255,0.04)] p-8">
                <h2 className="font-serif text-3xl">
                  {readString(block.data.title) || "Call to action"}
                </h2>
                <p className="mt-4 text-white/70">{readString(block.data.body)}</p>
              </section>
            );
          case "contact":
            return (
              <section key={block.id} className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="font-serif text-3xl">
                  {readString(block.data.title) || readString(block.data.heading) || "Contact"}
                </h2>
                <p className="mt-4 text-white/70">
                  {readString(block.data.email) || readString(block.data.phone) || "Contact details available on this page."}
                </p>
              </section>
            );
          case "stats":
            return (
              <section key={block.id} className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="font-serif text-3xl">
                  {readString(block.data.title) || readString(block.data.heading) || "Stats"}
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {readObjectArray<{ label?: unknown; value?: unknown }>(block.data.items).map((item, index) => (
                    <div key={`${block.id}-${index}`} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center text-white/75">
                      <p className="text-2xl font-semibold text-white">{readString(item.value) || "--"}</p>
                      <p className="mt-2 text-sm text-white/60">{readString(item.label) || `Metric ${index + 1}`}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          case "gallery":
            return (
              <section key={block.id} className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="font-serif text-3xl">
                  {readString(block.data.title) || readString(block.data.heading) || "Gallery"}
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {readObjectArray<{ imageUrl?: unknown; alt?: unknown; caption?: unknown }>(block.data.items).map((item, index) => (
                    <div key={`${block.id}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-sm text-white/65">
                      {readString(item.imageUrl) ? (
                        <img
                          src={readString(item.imageUrl)}
                          alt={readString(item.alt) || `Gallery item ${index + 1}`}
                          className="h-48 w-full object-cover"
                        />
                      ) : null}
                      <div className="p-4">
                        <p>{readString(item.caption) || readString(item.alt) || `Gallery item ${index + 1}`}</p>
                        <p className="mt-2 break-all text-white/35">{readString(item.imageUrl)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          default:
            return (
              <section key={block.id} className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-sm text-white/60">
                Unsupported block type: {block.type}
              </section>
            );
        }
      })}
    </>
  );
}
