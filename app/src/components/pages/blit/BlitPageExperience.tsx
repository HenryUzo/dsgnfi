import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { SiteScopedLink } from "../../SiteScopedLink";
import { PageBreadcrumbs } from "../PageBreadcrumbs";
import type { RenderablePageBlock } from "../PageBlocksRenderer";
import { ApiError, apiFetch } from "../../../lib/api";
import type { PublicPageDetail } from "../../../services/siteSettings";
import { usePublicSite } from "../../../site/PublicSiteContext";

type BlitPageExperienceProps = {
  page: PublicPageDetail;
  blocks: RenderablePageBlock[];
};

type StringRecord = Record<string, unknown>;

const orange = "#f4511e";

export function isBlitBlockType(type: string) {
  return type.startsWith("blit");
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readObjectArray<T extends StringRecord>(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is T => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function readJsonObjectArray<T extends StringRecord>(value: unknown) {
  if (Array.isArray(value)) {
    return readObjectArray<T>(value);
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    return readObjectArray<T>(JSON.parse(value));
  } catch {
    return [];
  }
}

function splitParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function isVideoSource(value: string) {
  return /\.mp4(\?|$)/i.test(value);
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

type BlitNavLink = {
  id: string;
  label: string;
  href: string;
};

type BlitTeamTrail = {
  id: number;
  x: number;
  y: number;
  drift: number;
};

const fallbackBlitNavLinks: BlitNavLink[] = [
  { id: "home", label: "home", href: "/" },
  { id: "works", label: "works", href: "/works" },
  { id: "studio", label: "studio", href: "/studio" },
  { id: "unfolded", label: "unfolded", href: "/unfolded" },
];

const blitTeamClouds = [
  { left: "3%", top: "12%", scale: 1.05 },
  { left: "28%", top: "9%", scale: 0.78 },
  { left: "76%", top: "14%", scale: 1.18 },
  { left: "8%", top: "28%", scale: 0.86 },
  { left: "51%", top: "29%", scale: 1.08 },
  { left: "86%", top: "35%", scale: 0.82 },
  { left: "16%", top: "48%", scale: 1.22 },
  { left: "64%", top: "52%", scale: 0.94 },
  { left: "38%", top: "66%", scale: 1.02 },
  { left: "79%", top: "70%", scale: 1.28 },
  { left: "6%", top: "84%", scale: 0.9 },
  { left: "47%", top: "88%", scale: 1.12 },
  { left: "88%", top: "91%", scale: 0.76 },
];

function getBlitNavLinks(
  items: Array<{ id: string; label: string; href: string }> | null | undefined
) {
  if (!items || items.length === 0) {
    return fallbackBlitNavLinks;
  }

  const resolved = items
    .filter((item) => item.href.trim().length > 0 && item.label.trim().length > 0)
    .map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
    }));

  return resolved.length > 0 ? resolved : fallbackBlitNavLinks;
}

function getBlitContactHref(links: BlitNavLink[]) {
  const contactLink =
    links.find((item) => item.href === "/contact") ??
    links.find((item) => item.label.trim().toLowerCase() === "contact");

  return contactLink?.href ?? "/contact";
}

function BlitLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-black/55">
      <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: orange }} />
      {children}
    </p>
  );
}

function BlitSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`blit-reveal bg-[#f2eee4] px-5 py-[84px] text-[#15130f] md:px-8 lg:px-12 ${className}`}>
      {children}
    </section>
  );
}

function BlitMedia({
  src,
  alt,
  className = "",
  video = false,
}: {
  src: string;
  alt?: string;
  className?: string;
  video?: boolean;
}) {
  if (!src) {
    return <div className={`bg-black/10 ${className}`} />;
  }

  if (video) {
    return (
      <video
        src={src}
        muted
        loop
        playsInline
        autoPlay
        className={`object-cover grayscale transition duration-700 group-hover:scale-[1.025] group-hover:grayscale-0 ${className}`}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? ""}
      className={`object-cover grayscale transition duration-700 group-hover:scale-[1.025] group-hover:grayscale-0 ${className}`}
    />
  );
}

type BlitCaseStudyMedia = {
  src: string;
  alt: string;
  kind: "image" | "video";
};

function readCaseStudyMediaItems(value: unknown) {
  return readObjectArray<StringRecord>(value)
    .map((item) => {
      const src = readString(item.src) || readString(item.imageUrl) || readString(item.videoUrl);
      const kindValue = readString(item.kind).toLowerCase();
      const kind =
        kindValue === "video" || isVideoSource(src) ? "video" : "image";

      return {
        src,
        alt: readString(item.alt) || readString(item.caption) || "Case study media",
        kind,
      } as BlitCaseStudyMedia;
    })
    .filter((item) => item.src);
}

function BlitMediaPanel({
  media,
  className = "",
}: {
  media: BlitCaseStudyMedia;
  className?: string;
}) {
  return (
    <div
      className={`group overflow-hidden bg-black/10 ${className}`}
      data-blit-cursor="media"
      data-blit-cursor-label="View"
    >
      <BlitMedia
        src={media.src}
        alt={media.alt}
        video={media.kind === "video"}
        className="h-full w-full"
      />
    </div>
  );
}

function BlitProjectCard({
  project,
  index,
  compact = false,
}: {
  project: StringRecord;
  index: number;
  compact?: boolean;
}) {
  const title = readString(project.title) || `Project ${index + 1}`;
  const image = readString(project.image);
  const category = readString(project.category);
  const year = readString(project.year);
  const description = readString(project.description);
  const href = readString(project.href);
  const wrapperClassName =
    "group relative block w-full max-w-[400px] overflow-hidden rounded-[14px] bg-white text-[#15130f] transition duration-500 hover:-translate-y-1";
  const content = (
    <>
      <div className={`overflow-hidden bg-black/10 ${compact ? "h-44" : "h-60 md:h-72"}`}>
        <BlitMedia src={image} alt={title} className="h-full w-full" />
      </div>
      <div className={compact ? "p-4" : "p-5"}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: orange }}>
          {[category, year].filter(Boolean).join(" / ")}
        </p>
        <h3 className={`${compact ? "mt-2 text-2xl" : "mt-3 text-3xl"} font-serif leading-none tracking-[-0.04em]`}>
          {title}
        </h3>
        {description && !compact ? (
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-black/60">{description}</p>
        ) : null}
      </div>
      <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-[#f4511e] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white opacity-0 transition duration-300 group-hover:opacity-100">
        Project
      </span>
    </>
  );

  if (href) {
    return (
      <SiteScopedLink
        to={href}
        className={wrapperClassName}
        data-blit-cursor="project"
        data-blit-cursor-label={title}
      >
        {content}
      </SiteScopedLink>
    );
  }

  return (
    <article
      className={wrapperClassName}
      data-blit-cursor="project"
      data-blit-cursor-label="Project"
    >
      {content}
    </article>
  );
}

function getBlitProjectLabels(project: StringRecord) {
  const labels = readStringArray(project.labels);
  if (labels.length > 0) {
    return labels;
  }

  const category = readString(project.category).replace(/\u00c2/g, "");
  return category
    .split(/\s*(?:\u00b7|\/|\||,)\s*/)
    .map((label) => label.trim())
    .filter(Boolean);
}

function getBlitProjectHref(project: StringRecord) {
  const href = readString(project.href);
  if (href) {
    return href;
  }

  const id = readString(project.id);
  return id ? `/works#${id}` : "";
}

function BlitWorksLabels({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-black/12 bg-white/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/52 transition duration-300 group-hover:border-[#f4511e]/45 group-hover:text-[#15130f]"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function BlitWorksProjectGroup({
  project,
  index,
}: {
  project: StringRecord;
  index: number;
}) {
  const id = readString(project.id);
  const title = readString(project.title) || `Project ${index + 1}`;
  const image = readString(project.image);
  const year = readString(project.year);
  const description = readString(project.description);
  const labels = getBlitProjectLabels(project);
  const href = getBlitProjectHref(project);
  const content = (
    <>
      <div className="text-group flex min-h-[190px] flex-col justify-between gap-8 py-2 lg:min-h-[280px]">
        <div className="flex items-start justify-between gap-5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-black/38">
            {String(index + 1).padStart(2, "0")}
          </span>
          {year ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-black/38">
              {year}
            </span>
          ) : null}
        </div>
        <div>
          <h2 className="max-w-4xl font-serif text-[13vw] leading-[0.88] tracking-[-0.07em] text-[#15130f] md:text-6xl lg:text-[5.7vw]">
            {title}
          </h2>
          {description ? (
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-black/58 md:text-base">
              {description}
            </p>
          ) : null}
        </div>
        <BlitWorksLabels labels={labels} />
      </div>
      <div
        className="image relative min-h-[280px] overflow-hidden bg-black/10 md:min-h-[420px] lg:h-[58vh] lg:min-h-[480px]"
        data-blit-cursor="project"
        data-blit-cursor-label="Open"
      >
        {image ? (
          <BlitMedia
            src={image}
            alt={title}
            className="h-full w-full object-cover grayscale transition duration-[900ms] group-hover:scale-[1.035] group-hover:grayscale-0"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/10 text-[10px] font-semibold uppercase tracking-[0.28em] text-black/32">
            No image
          </div>
        )}
        <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-[#f4511e] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white opacity-0 transition duration-300 group-hover:opacity-100">
          View
        </span>
      </div>
    </>
  );
  const className =
    "work-group group grid gap-6 border-t border-black/10 py-8 text-[#15130f] transition duration-500 hover:border-[#f4511e]/45 md:grid-cols-[minmax(0,0.88fr)_minmax(340px,1.12fr)] md:items-center md:gap-10 md:py-10 lg:gap-14";

  if (!href) {
    return (
      <article id={id || undefined} className={className}>
        {content}
      </article>
    );
  }

  return (
    <SiteScopedLink
      id={id || undefined}
      to={href}
      className={className}
      data-blit-cursor="project"
      data-blit-cursor-label={title}
    >
      {content}
    </SiteScopedLink>
  );
}

function BlitWorksMobileList({
  title,
  label,
  projects,
}: {
  title: string;
  label: string;
  projects: StringRecord[];
}) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 border-t border-black/10 pt-12 md:hidden">
      <h2 className="font-serif text-[18vw] leading-[0.84] tracking-[-0.08em] text-[#15130f]">
        {title}
      </h2>
      <div className="mt-10">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-black/42">
          {label}
        </p>
        <ul className="divide-y divide-black/10">
          {projects.map((project, index) => {
            const href = getBlitProjectHref(project);
            const itemTitle = readString(project.title) || `Project ${index + 1}`;
            const image = readString(project.image);
            const labels = getBlitProjectLabels(project);
            const content = (
              <span className="grid gap-4 py-5">
                <span className="font-serif text-[12vw] leading-[0.88] tracking-[-0.06em] text-[#15130f]">
                  {itemTitle}
                </span>
                <BlitWorksLabels labels={labels} />
                {image ? (
                  <span className="block h-56 overflow-hidden bg-black/10">
                    <BlitMedia src={image} alt={itemTitle} className="h-full w-full object-cover grayscale" />
                  </span>
                ) : null}
              </span>
            );

            return (
              <li key={`${readString(project.id) || index}-mobile`}>
                {href ? (
                  <SiteScopedLink to={href} className="group block">
                    {content}
                  </SiteScopedLink>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function BlitWorksIndexSection({
  block,
  projects,
  filters,
}: {
  block: RenderablePageBlock;
  projects: StringRecord[];
  filters: string[];
}) {
  const heading = readString(block.data.heading) || "works";
  const eyebrow = readString(block.data.eyebrow) || "selected works";
  const moreTitle = readString(block.data.moreTitle) || "more works";
  const listLabel = readString(block.data.listLabel) || "selected works";

  return (
    <section
      key={block.id}
      className="blit-reveal bg-[#f2eee4] px-5 pb-16 pt-[116px] text-[#15130f] md:px-8 md:pb-24 lg:px-12 lg:pt-[136px]"
    >
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-10 grid gap-8 border-b border-black/10 pb-8 md:mb-14 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)] md:items-end">
          <div>
            <p className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-black/48">
              <span className="h-[5px] w-[5px] rounded-full bg-[#f4511e]" />
              {eyebrow}
            </p>
            <h1 className="font-serif text-[22vw] leading-[0.78] tracking-[-0.09em] text-[#15130f] md:text-[14vw] lg:text-[12vw]">
              {heading}
            </h1>
          </div>
          {filters.length > 0 ? (
            <div className="flex flex-wrap gap-2 md:justify-end">
              {filters.map((filter) => (
                <span
                  key={filter}
                  className="rounded-full border border-black/12 bg-white/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/48"
                >
                  {filter}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {projects.length > 0 ? (
          <div className="hidden md:block">
            {projects.map((project, index) => (
              <BlitWorksProjectGroup
                key={`${block.id}-${readString(project.id) || index}`}
                project={project}
                index={index}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-black/45">No works have been added yet.</p>
        )}

        <div className="grid gap-8 md:hidden">
          {projects.map((project, index) => (
            <BlitWorksProjectGroup
              key={`${block.id}-${readString(project.id) || index}-stacked`}
              project={project}
              index={index}
            />
          ))}
        </div>
        <BlitWorksMobileList title={moreTitle} label={listLabel} projects={projects} />
      </div>
    </section>
  );
}

function chunkProjects(projects: StringRecord[], size: number) {
  const chunks: StringRecord[][] = [];
  for (let index = 0; index < projects.length; index += size) {
    chunks.push(projects.slice(index, index + size));
  }
  return chunks;
}

function BlitFeaturedWorkCarousel({
  eyebrow,
  title,
  ctaLabel,
  ctaHref,
  projects,
}: {
  eyebrow: string;
  title: string;
  ctaLabel: string;
  ctaHref: string;
  projects: StringRecord[];
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
    <>
      <BlitLabel>{eyebrow}</BlitLabel>
      <div className="mb-16 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <h2 className="max-w-4xl font-serif text-[12vw] leading-[0.88] tracking-[-0.075em] md:text-6xl lg:text-7xl">
          {title}
        </h2>
        <SiteScopedLink
          to={ctaHref}
          className="inline-flex w-fit items-center gap-3 rounded-full border border-black/20 px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#15130f] transition hover:border-[#15130f] hover:bg-white"
          data-blit-cursor="link"
          data-blit-cursor-label={ctaLabel}
        >
          {ctaLabel}
          <span aria-hidden="true">/</span>
        </SiteScopedLink>
      </div>

      <div ref={viewportRef} className="space-y-6">
        <div className="flex flex-wrap items-start gap-8">
          {currentProjects.map((project, index) => (
            <BlitProjectCard
              key={`${readString(project.id) || page}-${index}`}
              project={project}
              index={index + page * visibleCount}
            />
          ))}
        </div>

        {hasOverflow ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {pages.map((_, index) => (
                <button
                  key={`featured-indicator-${index}`}
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
    </>
  );
}

function BlitCustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    let frame = 0;

    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.18;
      current.current.y += (target.current.y - current.current.y) * 0.18;
      cursorRef.current?.style.setProperty("--x", `${current.current.x}px`);
      cursorRef.current?.style.setProperty("--y", `${current.current.y}px`);
      dotRef.current?.style.setProperty("--x", `${target.current.x}px`);
      dotRef.current?.style.setProperty("--y", `${target.current.y}px`);
      frame = window.requestAnimationFrame(tick);
    };

    const handleMove = (event: MouseEvent) => {
      target.current = { x: event.clientX, y: event.clientY };
      setVisible(true);
    };

    const handleWindowOut = () => setVisible(false);

    const handleOver = (event: MouseEvent) => {
      const targetEl = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-blit-cursor]") : null;
      if (!targetEl) {
        return;
      }
      setActive(true);
      setLabel(targetEl.dataset.blitCursorLabel ?? "");
    };

    const handleOut = (event: MouseEvent) => {
      const targetEl = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-blit-cursor]") : null;
      if (!targetEl) {
        return;
      }
      setActive(false);
      setLabel("");
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("mouseout", handleWindowOut);
    document.addEventListener("mouseover", handleOver);
    document.addEventListener("mouseout", handleOut);
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseout", handleWindowOut);
      document.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseout", handleOut);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div
        ref={cursorRef}
        className={`pointer-events-none fixed left-0 top-0 z-[10000] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/35 text-[10px] font-semibold uppercase tracking-[0.18em] text-black mix-blend-multiply transition-[height,width,opacity,background-color] duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        } ${active ? "h-20 w-20 bg-[#f4511e]/90 text-white" : "h-9 w-9 bg-transparent"}`}
        style={{ transform: "translate3d(calc(var(--x, 0px) - 50%), calc(var(--y, 0px) - 50%), 0)" }}
      >
        {active ? label : ""}
      </div>
      <div
        ref={dotRef}
        className={`pointer-events-none fixed left-0 top-0 z-[10001] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black transition-opacity duration-200 ${
          visible && !active ? "opacity-100" : "opacity-0"
        }`}
        style={{ transform: "translate3d(calc(var(--x, 0px) - 50%), calc(var(--y, 0px) - 50%), 0)" }}
      />
    </>
  );
}

function BlitNavigation() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { presentation } = usePublicSite();
  const logoUrl = presentation?.settings.logoUrl ?? "";
  const logoAlt = presentation?.settings.siteName || presentation?.site.name || "Site logo";
  const wordmark = presentation?.site.name ?? "Blit";
  const links = getBlitNavLinks(presentation?.navigation.primary);
  const contactHref = getBlitContactHref(links);

  useEffect(() => {
    document.body.classList.toggle("blit-menu-open", open);
    return () => document.body.classList.remove("blit-menu-open");
  }, [open]);

  useEffect(() => {
    const updateScrolled = () => {
      setScrolled(window.scrollY > 24);
    };

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });

    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-[9000] flex items-center justify-between px-5 py-5 text-[#15130f] transition-[background-color,backdrop-filter] duration-300 md:px-8 lg:px-12 ${
          scrolled
            ? "bg-[#f2eee4]/68 backdrop-blur-xl supports-[backdrop-filter]:bg-[#f2eee4]/52"
            : "bg-transparent shadow-none"
        }`}
      >
        <SiteScopedLink
          to="/"
          className="flex items-center text-[#15130f]"
          data-blit-cursor="link"
          data-blit-cursor-label="Home"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={logoAlt} className="h-10 w-auto object-contain" />
          ) : (
            <span className="font-serif text-xl text-[#15130f]">{wordmark}</span>
          )}
        </SiteScopedLink>
        <div className="flex items-center gap-6">
          <SiteScopedLink
            to={contactHref}
            className="rounded-full bg-[#f4511e] px-5 py-2 text-xs font-bold text-white mix-blend-normal"
            data-blit-cursor="link"
            data-blit-cursor-label="Contact"
          >
            Contact
          </SiteScopedLink>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="text-xs font-semibold uppercase tracking-[0.24em] text-[#15130f]"
            data-blit-cursor="menu"
            data-blit-cursor-label={open ? "Close" : "Menu"}
          >
            {open ? "close" : "menu"}
          </button>
        </div>
      </header>

      <div
        className={`blit-menu-overlay fixed inset-0 z-[8990] bg-[#15130f] px-6 py-24 text-[#f2eee4] transition duration-500 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="mx-auto flex h-full max-w-6xl flex-col justify-between">
          <nav className="grid gap-4">
            {links.map((link, index) => (
              <SiteScopedLink
                key={link.href}
                to={link.href}
                onClick={() => setOpen(false)}
                className="blit-menu-link font-serif text-[18vw] leading-[0.82] tracking-[-0.08em] text-[#f2eee4] transition hover:text-[#f4511e] md:text-8xl"
                style={{ transitionDelay: open ? `${index * 60}ms` : "0ms" }}
                data-blit-cursor="link"
                data-blit-cursor-label={link.label}
              >
                {link.label}
              </SiteScopedLink>
            ))}
          </nav>
          <div className="flex flex-col justify-between gap-6 border-t border-white/10 pt-6 text-xs uppercase tracking-[0.22em] text-white/50 md:flex-row">
            <span>Design, art, and technology.</span>
            <SiteScopedLink to={contactHref} onClick={() => setOpen(false)} className="text-white">
              let&apos;s talk
            </SiteScopedLink>
          </div>
        </div>
      </div>
    </>
  );
}

function BlitFooter() {
  const { presentation } = usePublicSite();
  const siteName = presentation?.site.name ?? "Blit";
  const email = presentation?.settings.contactEmail ?? "art@blit.studio";
  const footerLinks = getBlitNavLinks(
    presentation?.navigation.footer?.length ? presentation.navigation.footer : presentation?.navigation.primary
  );

  return (
    <footer className="bg-[#f2eee4] px-5 py-10 text-[#15130f] md:px-8 lg:px-12">
      <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <p className="text-2xl font-black leading-none">blit.</p>
          <p className="mt-5 max-w-[9rem] text-xs leading-tight">design, art, and technology.</p>
        </div>
        <div>
          <p className="mb-5 text-[10px] uppercase tracking-[0.28em] text-black/45">Navigation</p>
          <div className="grid gap-2 text-sm">
            {footerLinks.map((item) => (
              <SiteScopedLink key={item.id} to={item.href} className="w-fit transition hover:text-[#f4511e]">
                {item.label}
              </SiteScopedLink>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-5 text-[10px] uppercase tracking-[0.28em] text-black/45">Socials</p>
          <p className="max-w-xs text-sm leading-relaxed text-black/55">
            Add social links from Site Settings to show them here.
          </p>
        </div>
        <div>
          <p className="mb-5 text-[10px] uppercase tracking-[0.28em] text-black/45">Contact</p>
          <a href={`mailto:${email}`} className="text-sm underline-offset-4 hover:underline">
            {email}
          </a>
        </div>
      </div>
      <div className="mt-20 flex flex-col justify-between gap-4 pt-6 text-xs text-black/50 md:flex-row">
        <SiteScopedLink to="/privacy-policy">Privacy Policy</SiteScopedLink>
        <p>{siteName} is ready for site-specific address details.</p>
      </div>
    </footer>
  );
}

type HeroParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
};

function BlitHeroParticleField() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const host = hostRef.current;
    const canvas = canvasRef.current;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let context: CanvasRenderingContext2D | null = null;

    try {
      context = canvas?.getContext("2d") ?? null;
    } catch {
      context = null;
    }

    if (!host || !canvas || !context || prefersReducedMotion) {
      return;
    }

    let frame = 0;
    let width = 0;
    let height = 0;
    let particles: HeroParticle[] = [];
    const mouse = { x: 0, y: 0, active: false };

    const particleCount = () => {
      if (width >= 1440) {
        return 54;
      }

      if (width >= 1024) {
        return 42;
      }

      return 26;
    };

    const createParticle = (): HeroParticle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.24,
      vy: (Math.random() - 0.5) * 0.24,
      size: 0.8 + Math.random() * 2,
      alpha: 0.16 + Math.random() * 0.28,
    });

    const resizeCanvas = () => {
      width = host.clientWidth;
      height = host.clientHeight;

      if (!width || !height) {
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: particleCount() }, createParticle);
    };

    const updateMouse = (event: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      mouse.active = inside;

      if (!inside) {
        return;
      }

      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };

    const resetMouse = () => {
      mouse.active = false;
    };

    const drawFrame = () => {
      frame = window.requestAnimationFrame(drawFrame);

      if (!width || !height) {
        return;
      }

      context.clearRect(0, 0, width, height);

      if (mouse.active) {
        const glow = context.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180);
        glow.addColorStop(0, "rgba(244,81,30,0.14)");
        glow.addColorStop(0.45, "rgba(244,81,30,0.04)");
        glow.addColorStop(1, "rgba(244,81,30,0)");
        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);
      }

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -12) {
          particle.x = width + 12;
        } else if (particle.x > width + 12) {
          particle.x = -12;
        }

        if (particle.y < -12) {
          particle.y = height + 12;
        } else if (particle.y > height + 12) {
          particle.y = -12;
        }

        if (mouse.active) {
          const dx = particle.x - mouse.x;
          const dy = particle.y - mouse.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 140) {
            const force = (140 - distance) / 140;
            const angle = Math.atan2(dy, dx);
            particle.x += Math.cos(angle) * force * 1.8;
            particle.y += Math.sin(angle) * force * 1.8;
          }
        }
      });

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const nextParticle = particles[nextIndex];
          const dx = nextParticle.x - particle.x;
          const dy = nextParticle.y - particle.y;
          const distance = Math.hypot(dx, dy);

          if (distance > 122) {
            continue;
          }

          const strength = 1 - distance / 122;
          context.strokeStyle =
            mouse.active && distance < 86 ? `rgba(244,81,30,${strength * 0.18})` : `rgba(21,19,15,${strength * 0.08})`;
          context.lineWidth = 0.8;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(nextParticle.x, nextParticle.y);
          context.stroke();
        }
      }

      particles.forEach((particle) => {
        context.beginPath();
        context.fillStyle =
          mouse.active && Math.hypot(particle.x - mouse.x, particle.y - mouse.y) < 96
            ? `rgba(244,81,30,${particle.alpha + 0.1})`
            : `rgba(21,19,15,${particle.alpha})`;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      });
    };

    resizeCanvas();
    drawFrame();

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", updateMouse);
    window.addEventListener("mouseleave", resetMouse);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", updateMouse);
      window.removeEventListener("mouseleave", resetMouse);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full opacity-90" />
    </div>
  );
}

function BlitHeroCollageSection({ block }: { block: RenderablePageBlock }) {
  const images = readObjectArray<{ imageUrl?: unknown; alt?: unknown }>(block.data.images).slice(0, 3);

  return (
    <BlitSection
      key={block.id}
      className="relative isolate flex h-[100svh] min-h-[100svh] items-center overflow-hidden !pb-8 !pt-24 md:!pb-10 md:!pt-28 lg:!pt-24"
    >
      <BlitHeroParticleField />
      <div className="relative z-10 grid w-full items-center gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12">
        <div className="max-w-4xl">
          <BlitLabel>{readString(block.data.eyebrow) || "Dsgnfi"}</BlitLabel>
          <h1 className="font-serif text-[clamp(5.8rem,18.9vw,8.5rem)] leading-[0.82] tracking-normal md:text-[clamp(7rem,10.35vw,9.25rem)] lg:text-[clamp(7rem,7.85vw,9.8rem)] xl:text-[clamp(7.55rem,7.4vw,10.35rem)]">
            {readString(block.data.headline)}
          </h1>
          <p className="mt-5 max-w-xl text-xs leading-relaxed tracking-[0.02em] text-black/65 md:mt-6 md:text-sm">
            {readString(block.data.caption)}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:pt-[8vh]">
          {images.map((image, index) => (
            <div
              key={`${block.id}-hero-${index}`}
              className={`blit-hero-pill group h-[220px] overflow-hidden rounded-[16px] bg-black/10 md:h-[min(34vh,312px)] lg:h-[min(40vh,360px)] ${index === 1 ? "md:mt-[4vh]" : index === 2 ? "md:mt-[8vh]" : ""}`}
              data-blit-cursor="media"
              data-blit-cursor-label="View"
            >
              <BlitMedia src={readString(image.imageUrl)} alt={readString(image.alt)} className="h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    </BlitSection>
  );
}

function BlitScrollVideoSection({
  title,
  subtitle,
  videoUrl,
}: {
  title: string;
  subtitle: string;
  videoUrl: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1440,
    height: typeof window !== "undefined" ? window.innerHeight : 900,
  }));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let frame = 0;

    const updateProgress = () => {
      const node = sectionRef.current;
      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const total = Math.max(node.offsetHeight - window.innerHeight, 1);
      const traveled = clamp(-rect.top, 0, total);
      setProgress(traveled / total);
    };

    const onScroll = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateProgress();
      });
    };

    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      updateProgress();
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  const eased = 1 - Math.pow(1 - progress, 3);
  const collapsedWidth = Math.min(400, viewport.width - 72);
  const expandedWidth = Math.max(collapsedWidth, viewport.width - 48);
  const width = lerp(collapsedWidth, expandedWidth, eased);
  const collapsedHeight = Math.max(220, Math.min(320, viewport.height * 0.32));
  const expandedHeight = Math.max(collapsedHeight, viewport.height * 0.82);
  const height = lerp(collapsedHeight, expandedHeight, eased);
  const frameRadius = lerp(0, 0, eased);

  return (
    <section ref={sectionRef} className="blit-reveal bg-[#f2eee4] px-5 py-[84px] text-[#15130f] md:px-8 lg:px-12">
      <div className="mb-6 max-w-5xl">
        <BlitLabel>{title || "Showreel"}</BlitLabel>
        {subtitle ? <p className="max-w-2xl text-sm leading-relaxed text-black/60 md:text-base">{subtitle}</p> : null}
      </div>

      <div className="relative h-[210vh]">
        <div className="sticky top-[8vh] flex h-[88vh] items-start justify-center overflow-visible">
          <div
            className="group relative overflow-visible bg-black"
            data-blit-cursor="video"
            style={{
              width: `${width}px`,
              maxWidth: "100%",
              height: `${height}px`,
              borderRadius: `${frameRadius}px`,
              transition: "box-shadow 220ms ease",
              boxShadow: progress > 0.12 ? "0 24px 90px rgba(0,0,0,0.18)" : "none",
            }}
          >
            <BlitMedia src={videoUrl} video className="h-full w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

type BlitCapability = {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
};

function normalizeCapabilities(items: StringRecord[], fallbackImageUrls: string[]): BlitCapability[] {
  return items
    .map((item, index) => {
      const title = readString(item.title) || `Capability ${index + 1}`;
      const fallbackImageUrl =
        fallbackImageUrls[index % Math.max(fallbackImageUrls.length, 1)] ?? "";
      return {
        title,
        description: readString(item.description),
        imageUrl: readString(item.imageUrl) || fallbackImageUrl,
        imageAlt: readString(item.imageAlt) || title,
      };
    })
    .filter((item) => item.title || item.description || item.imageUrl);
}

function BlitCapabilitiesScroller({
  heading,
  fallbackImageUrls,
  items,
}: {
  heading: string;
  fallbackImageUrls: string[];
  items: StringRecord[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1440
  );
  const [reduceMotion, setReduceMotion] = useState(false);
  const capabilities = normalizeCapabilities(items, fallbackImageUrls);
  const safeCapabilities =
    capabilities.length > 0
      ? capabilities
      : [{ title: "Capability", description: "", imageUrl: fallbackImageUrls[0] ?? "", imageAlt: "Capability" }];
  const activeCapability = safeCapabilities[activeIndex] ?? safeCapabilities[0];
  const mobileLayout = viewportWidth < 768 || reduceMotion;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const updateActiveIndex = () => {
      const node = sectionRef.current;
      if (!node || window.innerWidth < 768 || motionQuery.matches) {
        setActiveIndex(0);
        return;
      }

      const rect = node.getBoundingClientRect();
      const total = Math.max(node.offsetHeight - window.innerHeight, 1);
      const traveled = clamp(-rect.top, 0, total);
      const progress = traveled / total;
      const nextIndex = clamp(
        Math.floor(progress * safeCapabilities.length),
        0,
        safeCapabilities.length - 1
      );
      setActiveIndex(nextIndex);
    };

    const onScroll = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActiveIndex();
      });
    };

    const onResize = () => {
      setViewportWidth(window.innerWidth);
      setReduceMotion(motionQuery.matches);
      updateActiveIndex();
    };

    const onMotionChange = () => {
      setReduceMotion(motionQuery.matches);
      updateActiveIndex();
    };

    setViewportWidth(window.innerWidth);
    setReduceMotion(motionQuery.matches);
    updateActiveIndex();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    motionQuery.addEventListener("change", onMotionChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      motionQuery.removeEventListener("change", onMotionChange);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [safeCapabilities.length]);

  if (mobileLayout) {
    return (
      <BlitSection className="space-y-8">
        <BlitLabel>{heading || "Capabilities"}</BlitLabel>
        {safeCapabilities.map((capability, index) => (
          <article key={`${capability.title}-${index}`} className="space-y-4">
            <div className="group h-80 overflow-hidden rounded-[10px] bg-black/10" data-blit-cursor="media" data-blit-cursor-label="View">
              <BlitMedia src={capability.imageUrl} alt={capability.imageAlt} className="h-full w-full" />
            </div>
            <div className="rounded-[8px] bg-white p-5">
              <h3 className="font-serif text-4xl leading-none">{capability.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-black/60">{capability.description}</p>
            </div>
          </article>
        ))}
      </BlitSection>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="blit-reveal bg-[#f2eee4] px-5 text-[#15130f] md:px-8 lg:px-12"
      style={{ height: `${Math.max(safeCapabilities.length * 100, 220)}vh` }}
    >
      <div className="sticky top-0 flex min-h-screen items-start pb-20 pt-24 md:pt-20 lg:pt-18">
        <div className="grid w-full gap-12 lg:grid-cols-[0.78fr_1fr] lg:items-center">
          <div>
            <BlitLabel>{heading || "Capabilities"}</BlitLabel>
            <div className="space-y-1">
              {safeCapabilities.map((capability, index) => {
                const active = index === activeIndex;
                return (
                  <button
                    key={`${capability.title}-${index}`}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`block w-full border-t border-black/10 py-6 text-left transition-[color,opacity,transform] duration-500 ease-out ${
                      active ? "text-[#15130f]" : "text-[#15130f]/30 hover:text-[#15130f]/55"
                    }`}
                    style={active ? { color: "var(--brand, #f4511e)" } : undefined}
                    data-blit-cursor="link"
                    data-blit-cursor-label={capability.title}
                  >
                    <span
                      className={`block font-serif leading-none transition-[font-size,transform] duration-500 ease-out ${
                        active
                          ? "text-5xl md:text-6xl lg:text-7xl"
                          : "text-3xl md:text-4xl lg:text-5xl"
                      }`}
                      style={{
                        transform: active ? "translate3d(0,0,0) scale(1)" : "translate3d(0,0,0) scale(0.94)",
                      }}
                    >
                      {capability.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="bg-white p-6 transition duration-500">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: orange }}>
                {String(activeIndex + 1).padStart(2, "0")} / {String(safeCapabilities.length).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-serif text-5xl leading-none">{activeCapability.title}</h3>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/60">
                {activeCapability.description}
              </p>
            </div>
            <div
              className="group relative h-[68vh] min-h-[520px] overflow-hidden bg-black/10"
              data-blit-cursor="media"
              data-blit-cursor-label="View"
            >
              {safeCapabilities.map((capability, index) => (
                <BlitMedia
                  key={`${capability.title}-${index}-image`}
                  src={capability.imageUrl}
                  alt={capability.imageAlt}
                  className={`absolute inset-0 h-full w-full transition duration-700 ${
                    index === activeIndex ? "scale-100 opacity-100" : "scale-[1.035] opacity-0"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BlitShapeField({
  invert = false,
  showAccent = true,
}: {
  invert?: boolean;
  showAccent?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span
        className={`absolute h-44 w-44 rounded-full md:h-72 md:w-72 ${
          invert ? "bg-white/88" : "bg-black"
        }`}
        style={{ left: "14%", top: "28%" }}
      />
      <span
        className={`absolute h-44 w-44 md:h-72 md:w-72 ${invert ? "bg-white/82" : "bg-black"}`}
        style={{ left: "43%", top: "38%" }}
      />
      <span
        className={`absolute h-12 w-64 origin-center rotate-[-45deg] md:h-20 md:w-[24rem] ${
          invert ? "bg-white/88" : "bg-black"
        }`}
        style={{ right: "8%", top: "38%" }}
      />
      {showAccent ? (
        <span className="absolute h-4 w-4 rounded-full bg-[#f4511e]" style={{ left: "7%", top: "20%" }} />
      ) : null}
    </div>
  );
}

function BlitStudioIntroSection({ block }: { block: RenderablePageBlock }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const node = sectionRef.current;
    if (!node) {
      return;
    }

    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height * 0.45), 0, 1);

      node.style.setProperty("--blit-intro-progress", progress.toFixed(4));
      node.style.setProperty("--blit-intro-title-y", `${lerp(72, -20, progress)}px`);
      node.style.setProperty("--blit-intro-body-y", `${lerp(92, -8, progress)}px`);
      node.style.setProperty("--blit-intro-video-y", `${lerp(40, -18, progress)}px`);
      node.style.setProperty("--blit-intro-video-scale", `${lerp(1.14, 1.02, progress).toFixed(4)}`);
      node.style.setProperty("--blit-intro-overlay", lerp(0.9, 0.7, progress).toFixed(4));
    };

    const onScroll = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[300svh]"
      style={
        {
          "--blit-intro-progress": "0",
          "--blit-intro-title-y": "72px",
          "--blit-intro-body-y": "92px",
          "--blit-intro-video-y": "40px",
          "--blit-intro-video-scale": "1.14",
          "--blit-intro-overlay": "0.9",
        } as CSSProperties
      }
    >
      <div className="blit-reveal blit-reveal-panel sticky top-0 min-h-[100svh] overflow-hidden bg-[#15130f] px-5 py-12 text-[#f2eee4] md:px-8 lg:px-12">
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12] transition-transform duration-300 ease-out"
          src="/assets/blit-hero-reel.mp4"
          autoPlay
          muted
          loop
          playsInline
          style={{
            transform:
              "translate3d(0, var(--blit-intro-video-y), 0) scale(var(--blit-intro-video-scale))",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(244,81,30,0.12),transparent_22%),linear-gradient(180deg,rgba(21,19,15,0.36)_0%,rgba(21,19,15,0.82)_52%,rgba(21,19,15,0.94)_100%)] transition-opacity duration-300 ease-out"
          style={{ opacity: "var(--blit-intro-overlay)" }}
          aria-hidden="true"
        />
        <BlitShapeField invert showAccent={false} />
        <div className="relative z-10 flex min-h-[100svh] items-center">
          <div className="grid w-full gap-12 lg:grid-cols-[0.66fr_0.34fr] lg:items-end">
            <p
              className="max-w-[calc(15ch+48px)] font-serif text-[8vw] leading-[0.9] tracking-[-0.06em] md:text-[4.15rem] lg:text-[3.8vw]"
              style={{ transform: "translate3d(0, var(--blit-intro-title-y), 0)" }}
            >
              {readString(block.data.body)}
            </p>
            <p
              className="max-w-sm pb-1 text-sm leading-relaxed text-white/76 md:text-base"
              style={{ transform: "translate3d(0, var(--blit-intro-body-y), 0)" }}
            >
              {readString(block.data.kicker)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BlitFormatStatementSection({ block }: { block: RenderablePageBlock }) {
  const shapeHostRef = useRef<HTMLDivElement>(null);

  const updateShapeMotion = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = shapeHostRef.current;
    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;

    node.style.setProperty("--blit-shape-square-x", `${offsetX * 42}px`);
    node.style.setProperty("--blit-shape-square-y", `${offsetY * 28}px`);
    node.style.setProperty("--blit-shape-bar-x", `${offsetX * -56}px`);
    node.style.setProperty("--blit-shape-bar-y", `${offsetY * -40}px`);
    node.style.setProperty("--blit-shape-dot-x", `${offsetX * 18}px`);
    node.style.setProperty("--blit-shape-dot-y", `${offsetY * 18}px`);
  };

  const resetShapeMotion = () => {
    const node = shapeHostRef.current;
    if (!node) {
      return;
    }

    node.style.setProperty("--blit-shape-square-x", "0px");
    node.style.setProperty("--blit-shape-square-y", "0px");
    node.style.setProperty("--blit-shape-bar-x", "0px");
    node.style.setProperty("--blit-shape-bar-y", "0px");
    node.style.setProperty("--blit-shape-dot-x", "0px");
    node.style.setProperty("--blit-shape-dot-y", "0px");
  };

  return (
    <BlitSection className="relative overflow-hidden py-24">
      <div className="grid gap-10 lg:grid-cols-[0.45fr_0.55fr] lg:items-center">
        <div className="group relative min-h-[420px] overflow-hidden bg-black/10" data-blit-cursor="media" data-blit-cursor-label="View">
          <BlitMedia src={readString(block.data.imageUrl)} alt={readString(block.data.title)} className="h-full min-h-[420px] w-full" />
          <span className="absolute left-[18%] top-[7%] h-28 w-28 rounded-full bg-[#f4511e] md:h-40 md:w-40" aria-hidden="true" />
          <span className="absolute bottom-[20%] right-[8%] h-44 w-44 rounded-full bg-black/45 md:h-64 md:w-64" aria-hidden="true" />
        </div>
        <div
          ref={shapeHostRef}
          className="relative min-h-[360px]"
          onPointerMove={updateShapeMotion}
          onPointerLeave={resetShapeMotion}
          style={
            {
              "--blit-shape-square-x": "0px",
              "--blit-shape-square-y": "0px",
              "--blit-shape-bar-x": "0px",
              "--blit-shape-bar-y": "0px",
              "--blit-shape-dot-x": "0px",
              "--blit-shape-dot-y": "0px",
            } as CSSProperties
          }
        >
          <span
            className="absolute left-0 top-[24%] h-40 w-60 bg-black transition-transform duration-300 ease-out md:h-52 md:w-[22rem]"
            style={{
              transform:
                "translate3d(var(--blit-shape-square-x), var(--blit-shape-square-y), 0)",
            }}
            aria-hidden="true"
          />
          <span
            className="absolute right-[8%] top-[30%] h-14 w-56 rotate-[-45deg] bg-black transition-transform duration-300 ease-out md:h-20 md:w-[20rem]"
            style={{
              transform:
                "rotate(-45deg) translate3d(var(--blit-shape-bar-x), var(--blit-shape-bar-y), 0)",
              transformOrigin: "center",
            }}
            aria-hidden="true"
          />
          <span
            className="absolute left-[42%] top-[28%] h-4 w-4 rounded-full bg-[#f4511e] transition-transform duration-300 ease-out"
            style={{
              transform:
                "translate3d(var(--blit-shape-dot-x), var(--blit-shape-dot-y), 0)",
            }}
            aria-hidden="true"
          />
          <h2 className="relative z-10 max-w-3xl font-serif text-5xl leading-[0.92] tracking-[-0.065em] text-white mix-blend-difference md:text-7xl lg:text-8xl">
            {readString(block.data.title)}
          </h2>
          <p className="relative z-10 mt-10 max-w-2xl text-base leading-relaxed text-white mix-blend-difference">
            {readString(block.data.body)}
          </p>
        </div>
      </div>
    </BlitSection>
  );
}

function BlitStudioImageStatementSection({ block }: { block: RenderablePageBlock }) {
  return (
    <BlitSection className="pb-20 pt-[200px]">
      <div
        className="group relative mx-auto w-full overflow-hidden bg-black lg:w-[68vw]"
        data-blit-cursor="media"
        data-blit-cursor-label="Studio"
      >
        <BlitMedia
          src={readString(block.data.imageUrl)}
          alt={readString(block.data.title)}
          className="blit-studio-image-zoom h-[62vh] min-h-[420px] w-full"
        />
        <BlitShapeField invert />
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
        <p className="text-xs uppercase tracking-[0.28em] text-black/45">{readString(block.data.caption)}</p>
        <h2 className="max-w-4xl text-4xl leading-none text-[#15130f] md:text-6xl">
          {readString(block.data.title)}
        </h2>
      </div>
    </BlitSection>
  );
}

function BlitTeamStatementSection({ block }: { block: RenderablePageBlock }) {
  const people = readObjectArray<StringRecord>(block.data.people);
  const title = readString(block.data.title);
  const cardPlacements = [
    "md:ml-auto md:max-w-[20rem] lg:col-span-3 lg:col-start-10 lg:row-start-1 lg:mt-[-11rem]",
    "md:max-w-[18rem] lg:col-span-3 lg:col-start-2 lg:row-start-2 lg:mt-28",
    "md:ml-auto md:max-w-[18rem] lg:col-span-3 lg:col-start-7 lg:row-start-3 lg:mt-10",
    "md:max-w-[17rem] lg:col-span-3 lg:col-start-10 lg:row-start-4 lg:mt-20",
    "md:ml-auto md:max-w-[18rem] lg:col-span-3 lg:col-start-4 lg:row-start-5 lg:mt-8",
    "md:max-w-[17rem] lg:col-span-3 lg:col-start-1 lg:row-start-6 lg:mt-16",
  ];
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const circleRef = useRef<HTMLSpanElement>(null);
  const squareRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const gameRef = useRef({ active: false, x: 0, y: 0, trailId: 0 });
  const [gameMarker, setGameMarker] = useState({ active: false, x: 0, y: 0 });
  const [gameTrails, setGameTrails] = useState<BlitTeamTrail[]>([]);

  const moveReactiveShape = (
    element: HTMLSpanElement | null,
    event: ReactPointerEvent<HTMLElement>,
    strength: number,
    maxDistance: number
  ) => {
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const proximity = clamp(1 - distance / maxDistance, 0, 1);

    element.style.setProperty("--blit-team-shape-x", `${deltaX * strength * proximity}px`);
    element.style.setProperty("--blit-team-shape-y", `${deltaY * strength * proximity}px`);
    element.style.setProperty("--blit-team-shape-scale", `${1 + proximity * 0.08}`);
  };

  const resetReactiveShape = (element: HTMLSpanElement | null) => {
    if (!element) {
      return;
    }

    element.style.setProperty("--blit-team-shape-x", "0px");
    element.style.setProperty("--blit-team-shape-y", "0px");
    element.style.setProperty("--blit-team-shape-scale", "1");
  };

  const updateShapeReaction = (event: ReactPointerEvent<HTMLElement>) => {
    moveReactiveShape(circleRef.current, event, 0.12, 260);
    moveReactiveShape(squareRef.current, event, 0.1, 260);
    moveReactiveShape(barRef.current, event, 0.08, 320);
  };

  const resetShapeReaction = () => {
    resetReactiveShape(circleRef.current);
    resetReactiveShape(squareRef.current);
    resetReactiveShape(barRef.current);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const section = sectionRef.current;
    const heading = headingRef.current;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!section || !heading || prefersReducedMotion) {
      return;
    }

    let frame = 0;

    const updateGameMarker = () => {
      frame = 0;

      const sectionRect = section.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const markerY = viewportHeight * 0.34;
      const headerHasReleasedMarker = headingRect.top < markerY;
      const sectionStillInPlay = sectionRect.bottom > viewportHeight + 80;
      const sectionHasStarted = sectionRect.top < markerY;
      const active = headerHasReleasedMarker && sectionHasStarted && sectionStillInPlay;

      if (!active) {
        if (gameRef.current.active) {
          gameRef.current = { ...gameRef.current, active: false };
          setGameMarker((current) => ({ ...current, active: false }));
          setGameTrails([]);
        }
        return;
      }

      const baseX = viewportWidth * 0.5;
      let targetX = baseX;
      const cards = Array.from(section.querySelectorAll("article"));
      const nearestCard = cards
        .map((card) => {
          const rect = card.getBoundingClientRect();
          const verticalDistance =
            markerY >= rect.top && markerY <= rect.bottom
              ? 0
              : Math.min(Math.abs(markerY - rect.top), Math.abs(markerY - rect.bottom));
          return { rect, verticalDistance };
        })
        .filter(({ rect, verticalDistance }) => {
          const horizontalDistance = Math.abs(rect.left + rect.width / 2 - baseX);
          return verticalDistance < 170 && horizontalDistance < viewportWidth * 0.48;
        })
        .sort((left, right) => left.verticalDistance - right.verticalDistance)[0];

      if (nearestCard) {
        const cardCenterX = nearestCard.rect.left + nearestCard.rect.width / 2;
        const avoidance = clamp(nearestCard.rect.width * 0.58, 140, 260);
        targetX =
          cardCenterX >= baseX
            ? clamp(baseX - avoidance, 34, viewportWidth - 34)
            : clamp(baseX + avoidance, 34, viewportWidth - 34);
      }

      const nextMarker = {
        active: true,
        x: Math.round(targetX),
        y: Math.round(markerY),
      };
      const current = gameRef.current;
      gameRef.current = { ...current, ...nextMarker };

      if (
        current.active !== nextMarker.active ||
        Math.abs(current.x - nextMarker.x) > 1 ||
        Math.abs(current.y - nextMarker.y) > 1
      ) {
        setGameMarker(nextMarker);
      }
    };

    const scheduleUpdate = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(updateGameMarker);
    };

    const trailTimer = window.setInterval(() => {
      const current = gameRef.current;
      if (!current.active) {
        return;
      }

      const trail = {
        id: current.trailId + 1,
        x: current.x,
        y: current.y - 46,
        drift: current.x > window.innerWidth / 2 ? -24 : 24,
      };
      gameRef.current = { ...current, trailId: trail.id };
      setGameTrails((existingTrails) => [...existingTrails.slice(-5), trail]);
      window.setTimeout(() => {
        setGameTrails((existingTrails) => existingTrails.filter((item) => item.id !== trail.id));
      }, 1900);
    }, 2000);

    updateGameMarker();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.clearInterval(trailTimer);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#f2eee4] px-5 py-24 text-[#15130f] md:px-8 lg:min-h-[112rem] lg:px-12 lg:py-28"
      onPointerMove={updateShapeReaction}
      onPointerLeave={resetShapeReaction}
    >
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        {blitTeamClouds.map((cloud) => (
          <span
            key={`${cloud.left}-${cloud.top}`}
            className="blit-team-cloud absolute"
            style={{
              left: cloud.left,
              top: cloud.top,
              transform: `scale(${cloud.scale})`,
            }}
          />
        ))}
      </div>

      {gameMarker.active ? (
        <span
          className="blit-team-game-player pointer-events-none fixed z-[9000]"
          style={{
            left: `${gameMarker.x}px`,
            top: `${gameMarker.y}px`,
          }}
          aria-hidden="true"
        />
      ) : null}

      {gameTrails.map((trail) => (
        <span
          key={trail.id}
          className="blit-team-game-trail pointer-events-none fixed z-[8999]"
          style={
            {
              left: `${trail.x}px`,
              top: `${trail.y}px`,
              "--blit-team-trail-drift": `${trail.drift}px`,
            } as CSSProperties
          }
          aria-hidden="true"
        />
      ))}

      <div className="relative">
        <div className="relative lg:ml-[16%]">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <span
              ref={circleRef}
              className="blit-team-shape absolute left-[0%] top-1/2 h-28 w-28 rounded-full bg-black md:h-44 md:w-44 lg:left-[4%] lg:h-[17rem] lg:w-[17rem]"
              style={
                {
                  "--blit-team-shape-x": "0px",
                  "--blit-team-shape-y": "0px",
                  "--blit-team-shape-scale": "1",
                  transform:
                    "translate3d(var(--blit-team-shape-x), calc(-50% + var(--blit-team-shape-y)), 0) scale(var(--blit-team-shape-scale))",
                } as CSSProperties
              }
            />
            <span
              ref={squareRef}
              className="blit-team-shape absolute left-[16%] top-1/2 h-32 w-32 bg-black md:h-48 md:w-48 lg:left-[30%] lg:h-[17rem] lg:w-[17rem]"
              style={
                {
                  "--blit-team-shape-x": "0px",
                  "--blit-team-shape-y": "0px",
                  "--blit-team-shape-scale": "1",
                  transform:
                    "translate3d(var(--blit-team-shape-x), calc(-50% + var(--blit-team-shape-y)), 0) scale(var(--blit-team-shape-scale))",
                } as CSSProperties
              }
            />
            <span
              ref={barRef}
              className="blit-team-shape absolute left-[32%] top-1/2 h-10 w-36 bg-black md:h-14 md:w-56 lg:left-[56%] lg:h-[4rem] lg:w-[17rem]"
              style={
                {
                  "--blit-team-shape-x": "0px",
                  "--blit-team-shape-y": "0px",
                  "--blit-team-shape-scale": "1",
                  transform:
                    "translate3d(var(--blit-team-shape-x), calc(-50% + var(--blit-team-shape-y)), 0) rotate(-45deg) scale(var(--blit-team-shape-scale))",
                  transformOrigin: "center",
                } as CSSProperties
              }
            />
            <span className="absolute left-[38%] top-[8%] h-3 w-3 rounded-full bg-[#f4511e] md:h-4 md:w-4" />
          </div>
          <h2
            ref={headingRef}
            className="relative z-10 max-w-[11.8ch] font-serif text-[15vw] leading-[0.88] tracking-[-0.07em] text-white mix-blend-difference md:text-[9vw] lg:max-w-[12.2ch] lg:text-[6.2vw]"
          >
            {title}
          </h2>
        </div>

        {people.length > 0 ? (
          <div className="relative z-20 mt-16 grid gap-20 md:grid-cols-2 md:gap-14 lg:mt-[-7rem] lg:grid-cols-12 lg:grid-rows-[auto_auto_auto_auto_auto_auto] lg:items-start lg:gap-y-36">
            {people.map((person, index) => (
              <article
                key={`${readString(person.name)}-${index}`}
                className={`w-full ${cardPlacements[index] ?? "md:max-w-[18rem] lg:col-span-3 lg:col-start-5 lg:mt-20"}`}
              >
                <p className="font-serif text-[28px] leading-tight text-[#15130f]">{readString(person.name)}</p>
                <p className="text-[16px] leading-relaxed text-black/55">{readString(person.role)}</p>
                <div
                  className="group mt-3 overflow-hidden bg-black/10"
                  data-blit-cursor="person"
                  data-blit-cursor-label={readString(person.name)}
                >
                  <BlitMedia
                    src={readString(person.imageUrl)}
                    alt={readString(person.name)}
                    className="aspect-[3/4] w-full"
                  />
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BlitAwardsSection({ block }: { block: RenderablePageBlock }) {
  const heading = readString(block.data.heading) || "awards";
  const body = readString(block.data.body);
  const secondaryBody = readString(block.data.secondaryBody);

  return (
    <section className="relative overflow-hidden bg-[#f2eee4] px-5 py-24 text-[#15130f] md:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[96rem]">
        <div className="lg:ml-[30%]">
          <BlitLabel>{heading}</BlitLabel>
        </div>

        <div className="relative mx-auto mt-8 max-w-[86rem] lg:pl-[24%]">
          <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
            <svg
              viewBox="0 0 240 240"
              className="blit-awards-verified-sticker absolute left-[12%] top-[32%] h-[20rem] w-[20rem] text-black"
            >
              <g fill="currentColor">
                <circle cx="120" cy="120" r="76" />
                <circle cx="120" cy="28" r="28" />
                <circle cx="166" cy="40" r="28" />
                <circle cx="201" cy="74" r="28" />
                <circle cx="212" cy="120" r="28" />
                <circle cx="201" cy="166" r="28" />
                <circle cx="166" cy="201" r="28" />
                <circle cx="120" cy="212" r="28" />
                <circle cx="74" cy="201" r="28" />
                <circle cx="39" cy="166" r="28" />
                <circle cx="28" cy="120" r="28" />
                <circle cx="39" cy="74" r="28" />
                <circle cx="74" cy="40" r="28" />
              </g>
            </svg>
            <span className="absolute left-[42%] top-[32%] h-0 w-0 border-b-[18rem] border-l-[10.5rem] border-r-[10.5rem] border-b-black border-l-transparent border-r-transparent" />
            <span className="absolute right-[8%] top-[44%] h-20 w-[22rem] rotate-[-45deg] bg-black" />
            <span className="absolute left-[27%] top-[37%] h-4 w-4 rounded-full bg-[#f4511e]" />
          </div>

          <h2 className="relative z-10 max-w-[14ch] font-serif text-[clamp(3.25rem,5.6vw,6.8rem)] leading-[0.96] tracking-[-0.06em] text-white mix-blend-difference">
            {body}
          </h2>
        </div>

        <div className="mt-20 grid gap-12 lg:grid-cols-[0.27fr_0.73fr] lg:items-start">
          <p className="max-w-sm text-2xl leading-[1.08] tracking-[-0.04em] text-[#15130f] md:text-3xl lg:pt-2">
            {secondaryBody}
          </p>
          <div className="group overflow-hidden bg-black/10" data-blit-cursor="media" data-blit-cursor-label="Awards">
            <BlitMedia
              src={readString(block.data.imageUrl)}
              alt={heading}
              className="h-[48vh] min-h-[360px] w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function BlitVideoQuoteSection({ block }: { block: RenderablePageBlock }) {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const videoUrl = readString(block.data.videoUrl);

  useEffect(() => {
    if (!isVideoModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVideoModalOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVideoModalOpen]);

  const videoModal =
    isVideoModalOpen && videoUrl && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-black/92 px-4 py-8 backdrop-blur-[3px] md:px-8"
            onClick={() => setIsVideoModalOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute left-1/2 top-5 z-10 -translate-x-1/2 text-4xl leading-none text-white/90 transition hover:text-white"
              aria-label="Close video"
            >
              ×
            </button>
            <div
              className="relative flex w-full max-w-[56rem] items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              <video
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[82vh] w-full bg-black object-contain shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
              />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <section className="blit-reveal bg-black text-white">
        <div
          className={`group relative isolate overflow-hidden bg-black ${videoUrl ? "cursor-pointer" : ""}`}
          data-blit-cursor={videoUrl ? "video" : "default"}
          data-blit-cursor-label={videoUrl ? "Play" : "Scroll"}
          onClick={videoUrl ? () => setIsVideoModalOpen(true) : undefined}
        >
          <BlitMedia
            src={videoUrl}
            video
            className="pointer-events-none h-screen min-h-[560px] w-full opacity-95"
          />
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center gap-16 md:flex" aria-hidden="true">
            <span className="h-[19vw] max-h-[22rem] min-h-[12rem] w-[19vw] min-w-[12rem] max-w-[22rem] rounded-full bg-white mix-blend-difference" />
            <span className="h-[19vw] max-h-[22rem] min-h-[12rem] w-[19vw] min-w-[12rem] max-w-[22rem] bg-white mix-blend-difference" />
            <span className="h-[5vw] max-h-[6rem] min-h-[3rem] w-[21vw] min-w-[14rem] max-w-[24rem] rotate-[-45deg] bg-white mix-blend-difference" />
          </div>
        </div>

        <div className="relative min-h-[720px] px-5 pb-14 pt-16 md:px-8 lg:px-12">
          <p className="relative z-10 max-w-[28rem] text-2xl font-semibold leading-[0.98] tracking-[-0.06em] text-white">
            {readString(block.data.kicker)}
          </p>

          <h2 className="relative z-10 mt-28 max-w-[18ch] font-serif text-6xl leading-[0.96] tracking-[-0.055em] text-white md:text-7xl lg:text-[6.2rem]">
            {readString(block.data.quote)}
          </h2>

          <p className="relative z-10 mt-16 max-w-[34rem] text-2xl font-semibold leading-[0.98] tracking-[-0.06em] text-white">
            {readString(block.data.body)}
          </p>

          <SiteScopedLink
            to={readString(block.data.ctaHref) || "/contact"}
            className="relative z-10 ml-auto mt-24 flex w-fit items-center gap-3 text-6xl leading-none tracking-[-0.06em] text-[#f4511e] transition hover:text-white"
            data-blit-cursor="link"
            data-blit-cursor-label={readString(block.data.ctaLabel) || "Contact"}
          >
            <span className="h-12 w-12 rounded-full bg-[#f4511e]" aria-hidden="true" />
            {readString(block.data.ctaLabel) || "let's talk"}
          </SiteScopedLink>
        </div>
      </section>
      {videoModal}
    </>
  );
}

function BlitCareersSection({ block }: { block: RenderablePageBlock }) {
  const jobs = readObjectArray<StringRecord>(block.data.jobs);

  return (
    <section className="blit-reveal bg-[#f4511e] px-5 py-12 text-black md:px-8 lg:px-12 lg:py-20">
      <div className="max-w-[118rem]">
        <div className="pb-16 lg:pb-20">
          <h2 className="font-serif text-[4.5rem] leading-[0.92] md:text-[6rem] lg:text-[7.2rem]">
            {readString(block.data.title) || "Careers"}
          </h2>
          <p className="mt-14 max-w-[28rem] text-2xl leading-[1.08] md:text-[2.2rem]">
            {readString(block.data.body)}
          </p>
        </div>

        <div className="border-t border-black">
          {jobs.map((job, index) => (
            <SiteScopedLink
              key={`${readString(job.title)}-${index}`}
              to={readString(job.href) || "/contact"}
              className="flex items-center justify-between gap-6 border-b border-black px-4 py-6 text-[1.6rem] transition hover:bg-black/5 md:px-6 md:py-7 lg:px-12 lg:text-[2rem]"
              data-blit-cursor="job"
              data-blit-cursor-label="View"
            >
              <span className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full bg-black md:h-5 md:w-5" aria-hidden="true" />
                <span>{readString(job.title)}</span>
              </span>
              <span className="shrink-0 text-base underline underline-offset-4 md:text-lg">View offer</span>
            </SiteScopedLink>
          ))}
        </div>
      </div>
    </section>
  );
}

type BlitContactFormState = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  message: string;
  website: string;
};

const emptyBlitContactForm: BlitContactFormState = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  jobTitle: "",
  message: "",
  website: "",
};

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

function getBlitContactGroups(block: RenderablePageBlock | undefined) {
  return readObjectArray<StringRecord>(block?.data.groups).map((group) => ({
    title: readString(group.title),
    contacts:
      readObjectArray<StringRecord>(group.contacts).length > 0
        ? readObjectArray<StringRecord>(group.contacts)
        : readJsonObjectArray<StringRecord>(group.contactsJson),
  }));
}

function BlitContactField({
  id,
  name,
  label,
  value,
  onChange,
  error,
  required = false,
  type = "text",
}: {
  id: string;
  name: keyof BlitContactFormState;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium tracking-[-0.01em] text-[#15130f]">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-7 w-full border-0 border-b border-[#15130f]/38 bg-transparent px-0 pb-3 pt-1 text-lg text-[#15130f] outline-none transition placeholder:text-black/30 focus:border-[#f4511e]"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f4511e]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function BlitContactPageSection({
  heroBlock,
  allBlocks,
}: {
  heroBlock: RenderablePageBlock;
  allBlocks: RenderablePageBlock[];
}) {
  const contactBlock = allBlocks.find((entry) => entry.type === "blitContactGrid");
  const officesBlock = allBlocks.find((entry) => entry.type === "blitOffices");
  const groups = getBlitContactGroups(contactBlock).filter((group) => group.title || group.contacts.length > 0);
  const offices = readObjectArray<StringRecord>(officesBlock?.data.offices);
  const headingParts = splitBlitContactHeading(readString(heroBlock.data.title) || "start a project");
  const intro = readString(heroBlock.data.formIntro) || readString(heroBlock.data.subtitle);
  const submitLabel = readString(heroBlock.data.submitLabel) || "Send Message";
  const successCopy = readString(heroBlock.data.successCopy) || "Thank you. Your submission has been received.";
  const [formData, setFormData] = useState<BlitContactFormState>(emptyBlitContactForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: [] }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitted(false);
    setFormError(null);
    setFieldErrors({});

    try {
      await apiFetch<{ ok: true }>("/public/contact", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          pagePath: typeof window === "undefined" ? "/contact" : window.location.pathname,
        }),
      });
      setSubmitted(true);
      setFormData(emptyBlitContactForm);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        setFieldErrors(error.fieldErrors);
      }
      setFormError(error instanceof Error ? error.message : "Could not send your message.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (name: keyof BlitContactFormState) => fieldErrors[name]?.[0];

  return (
    <section
      key={heroBlock.id}
      className="blit-reveal bg-[#f2eee4] px-4 pb-20 pt-[112px] text-[#15130f] md:px-8 md:pb-28 md:pt-[136px] lg:px-12"
    >
      <div className="mx-auto max-w-[1680px]">
        <div className="text-center">
          <h1
            className="mx-auto max-w-[1380px] font-serif text-[clamp(5.2rem,18.8vw,18rem)] leading-[0.86] tracking-normal text-[#15130f]"
            aria-label={[headingParts.lead, headingParts.accent].filter(Boolean).join(" ")}
          >
            <span className="block">{headingParts.lead}</span>
            {headingParts.accent ? <em className="block font-serif italic">{headingParts.accent}</em> : null}
          </h1>
          {intro ? (
            <p className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-black/58 md:text-base">
              {intro}
            </p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mx-auto mt-14 w-full max-w-[512px] md:mt-20" noValidate={false}>
          <input
            type="text"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
            className="hidden"
            autoComplete="off"
            tabIndex={-1}
            aria-hidden="true"
          />

          <div className="grid grid-cols-2 gap-x-6 gap-y-10">
            <BlitContactField
              id="blit-contact-first-name"
              name="firstName"
              label="First Name"
              value={formData.firstName}
              onChange={handleInputChange}
              error={fieldError("firstName")}
            />
            <BlitContactField
              id="blit-contact-last-name"
              name="lastName"
              label="Last Name"
              value={formData.lastName}
              onChange={handleInputChange}
              error={fieldError("lastName")}
            />
          </div>

          <div className="mt-10 space-y-10">
            <BlitContactField
              id="blit-contact-email"
              name="email"
              label="Email *"
              value={formData.email}
              onChange={handleInputChange}
              error={fieldError("email")}
              required
              type="email"
            />
            <BlitContactField
              id="blit-contact-company"
              name="company"
              label="Company Name *"
              value={formData.company}
              onChange={handleInputChange}
              error={fieldError("company")}
              required
            />
            <BlitContactField
              id="blit-contact-job-title"
              name="jobTitle"
              label="Job Title"
              value={formData.jobTitle}
              onChange={handleInputChange}
              error={fieldError("jobTitle")}
            />
            <div>
              <label htmlFor="blit-contact-message" className="block text-sm font-medium tracking-[-0.01em] text-[#15130f]">
                Tell Us More About The Project *
              </label>
              <textarea
                id="blit-contact-message"
                name="message"
                required
                value={formData.message}
                onChange={handleInputChange}
                aria-invalid={Boolean(fieldError("message"))}
                aria-describedby={fieldError("message") ? "blit-contact-message-error" : undefined}
                className="mt-7 min-h-28 w-full resize-y border-0 border-b border-[#15130f]/38 bg-transparent px-0 pb-3 pt-1 text-lg text-[#15130f] outline-none transition focus:border-[#f4511e]"
              />
              {fieldError("message") ? (
                <p id="blit-contact-message-error" className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f4511e]">
                  {fieldError("message")}
                </p>
              ) : null}
            </div>
          </div>

          {formError ? (
            <p className="mt-6 text-center text-sm text-[#f4511e]">{formError}</p>
          ) : null}
          {submitted ? (
            <p className="mt-6 text-center text-sm text-black/62">{successCopy}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-7 w-full rounded-full bg-[#15130f] px-8 py-4 text-base font-semibold text-[#f2eee4] transition hover:bg-[#f4511e] focus:outline-none focus:ring-2 focus:ring-[#f4511e] focus:ring-offset-4 focus:ring-offset-[#f2eee4] disabled:cursor-not-allowed disabled:opacity-60"
            data-blit-cursor="link"
            data-blit-cursor-label={submitting ? "Sending" : submitLabel}
          >
            {submitting ? "Sending..." : submitLabel}
          </button>
        </form>

        {(groups.length > 0 || offices.length > 0) ? (
          <div className="mt-24 border-t border-black/12 pt-10 md:mt-32">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
              {groups.length > 0 ? (
                <div className="grid gap-8 md:grid-cols-3">
                  {groups.map((group, index) => (
                    <article key={`${heroBlock.id}-group-${index}`} className="border-t border-black/12 pt-5">
                      <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-black/48">
                        <span className="h-[5px] w-[5px] rounded-full bg-[#f4511e]" />
                        {group.title || "Contact"}
                      </p>
                      <div className="space-y-5">
                        {group.contacts.map((contact, contactIndex) => {
                          const email = readString(contact.email);
                          return (
                            <div key={`${heroBlock.id}-contact-${index}-${contactIndex}`}>
                              <p className="font-serif text-2xl leading-none tracking-normal text-[#15130f]">
                                {readString(contact.name)}
                              </p>
                              {readString(contact.role) ? (
                                <p className="mt-2 text-sm text-black/52">{readString(contact.role)}</p>
                              ) : null}
                              {email ? (
                                <a className="mt-3 block text-sm underline decoration-black/20 underline-offset-4 transition hover:text-[#f4511e]" href={`mailto:${email}`}>
                                  {email}
                                </a>
                              ) : null}
                              {readString(contact.phone) ? (
                                <p className="mt-1 text-sm text-black/52">{readString(contact.phone)}</p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {offices.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                  {offices.map((office, index) => (
                    <article key={`${heroBlock.id}-office-${index}`} className="border-t border-black/12 pt-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/42">Office</p>
                      <h2 className="mt-3 font-serif text-4xl leading-none tracking-normal">{readString(office.name)}</h2>
                      {readString(office.phone) ? <p className="mt-4 text-sm text-black/58">{readString(office.phone)}</p> : null}
                      {readString(office.address) ? <p className="mt-1 text-sm leading-relaxed text-black/58">{readString(office.address)}</p> : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function renderBlitBlock(block: RenderablePageBlock, allBlocks: RenderablePageBlock[]) {
  switch (block.type) {
    case "blitHeroCollage": {
      return <BlitHeroCollageSection key={block.id} block={block} />;
    }
    case "blitFeaturedWork": {
      const projects = readObjectArray<StringRecord>(block.data.projects);
      const eyebrow = readString(block.data.heading) || "Featured work";
      const title = readString(block.data.title) || "Selected projects";
      const ctaLabel = readString(block.data.ctaLabel) || "See all projects";
      const ctaHref = readString(block.data.ctaHref) || "/works";
      return (
        <BlitSection key={block.id}>
          <BlitFeaturedWorkCarousel
            eyebrow={eyebrow}
            title={title}
            ctaLabel={ctaLabel}
            ctaHref={ctaHref}
            projects={projects}
          />
        </BlitSection>
      );
    }
    case "blitEditorialStatement":
    case "blitPhilosophy":
      return (
        <BlitSection key={block.id} className="lg:py-32">
          <div className="max-w-5xl">
            <BlitLabel>{readString(block.data.eyebrow) || readString(block.data.heading) || "Studio statement"}</BlitLabel>
            <h2 className="font-serif text-[12vw] leading-[0.88] tracking-[-0.075em] md:text-7xl lg:text-8xl">
              {readString(block.data.title) || readString(block.data.heading)}
            </h2>
            <p className="mt-8 max-w-3xl text-sm leading-relaxed text-black/65 md:text-base">{readString(block.data.body)}</p>
          </div>
        </BlitSection>
      );
    case "blitStudioIntro":
      return <BlitStudioIntroSection key={block.id} block={block} />;
    case "blitFormatStatement":
      return <BlitFormatStatementSection key={block.id} block={block} />;
    case "blitStudioImageStatement":
      return <BlitStudioImageStatementSection key={block.id} block={block} />;
    case "blitTeamStatement":
      return <BlitTeamStatementSection key={block.id} block={block} />;
    case "blitAwards":
      return <BlitAwardsSection key={block.id} block={block} />;
    case "blitVideoQuote":
      return <BlitVideoQuoteSection key={block.id} block={block} />;
    case "blitCareers":
      return <BlitCareersSection key={block.id} block={block} />;
    case "blitVideoSection":
      return (
        <BlitScrollVideoSection
          key={block.id}
          title={readString(block.data.title) || "Showreel"}
          subtitle={readString(block.data.subtitle)}
          videoUrl={readString(block.data.videoUrl)}
        />
      );
    case "blitUnfoldedHero":
      return (
        <BlitSection key={block.id}>
          <div
            className="group overflow-hidden bg-black"
            data-blit-cursor="video"
            data-blit-cursor-label="Play reel"
          >
            <BlitMedia src={readString(block.data.videoUrl)} video className="h-[58vh] w-full" />
          </div>
          <BlitLabel>{readString(block.data.title) || "Showreel"}</BlitLabel>
          {readString(block.data.subtitle) ? (
            <p className="max-w-2xl text-sm leading-relaxed text-black/60">{readString(block.data.subtitle)}</p>
          ) : null}
        </BlitSection>
      );
    case "blitCapabilitiesGrid": {
      const blockFallbackImage = readString(block.data.imageUrl);
      const pageImageUrls = collectImageUrls(allBlocks).filter((url) => url !== blockFallbackImage);
      return (
        <BlitCapabilitiesScroller
          key={block.id}
          heading={readString(block.data.heading) || "Capabilities"}
          fallbackImageUrls={[blockFallbackImage, ...pageImageUrls].filter(Boolean)}
          items={readObjectArray<StringRecord>(block.data.items)}
        />
      );
    }
    case "blitHorizontalGallery":
    case "blitOriginals": {
      const projects = readObjectArray<StringRecord>(block.data.projects);
      return (
        <BlitSection key={block.id}>
          <BlitLabel>{readString(block.data.heading) || "Selected moments"}</BlitLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((project, index) => (
              <BlitProjectCard key={`${block.id}-${index}`} project={project} index={index} compact />
            ))}
          </div>
        </BlitSection>
      );
    }
    case "blitFinalStatement":
      return (
        <BlitSection key={block.id} className="py-28">
          <h2 className="max-w-6xl font-serif text-[13vw] leading-[0.86] tracking-[-0.08em] md:text-7xl lg:text-8xl">
            {readString(block.data.title)}
          </h2>
        </BlitSection>
      );
    case "blitCaseStudyHero": {
      const summaryParagraphs = splitParagraphs(readString(block.data.introBody));
      const primaryMedia: BlitCaseStudyMedia = {
        src: readString(block.data.primaryMediaUrl),
        alt: readString(block.data.title) || "Case study hero media",
        kind:
          readString(block.data.primaryMediaKind).toLowerCase() === "video" ||
          isVideoSource(readString(block.data.primaryMediaUrl))
            ? "video"
            : "image",
      };
      const secondaryMedia: BlitCaseStudyMedia = {
        src: readString(block.data.secondaryMediaUrl),
        alt: `${readString(block.data.title) || "Case study"} detail`,
        kind:
          readString(block.data.secondaryMediaKind).toLowerCase() === "video" ||
          isVideoSource(readString(block.data.secondaryMediaUrl))
            ? "video"
            : "image",
      };
      const metaItems = [
        readString(block.data.year),
        readString(block.data.category),
        readString(block.data.discipline),
        readString(block.data.location),
      ].filter(Boolean);

      return (
        <BlitSection key={block.id} className="pt-32">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div className="space-y-10">
              {metaItems.length > 0 ? (
                <div className="grid gap-3 border-t border-black/10 pt-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/52 sm:grid-cols-2">
                  {metaItems.map((item) => (
                    <p key={`${block.id}-${item}`}>{item}</p>
                  ))}
                </div>
              ) : null}

              <div>
                <BlitLabel>{readString(block.data.eyebrow) || "Work"}</BlitLabel>
                <h1 className="max-w-4xl font-serif text-[12vw] leading-[0.86] tracking-[-0.08em] md:text-7xl lg:text-[7.3vw]">
                  {readString(block.data.title)}
                </h1>
                <p className="mt-8 max-w-2xl text-sm leading-relaxed text-black/68 md:text-base">
                  {readString(block.data.summary)}
                </p>
              </div>

              <div className="grid gap-6 border-t border-black/10 pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/45">
                    {readString(block.data.projectLabel)}
                  </p>
                  <p className="mt-3 font-serif text-3xl leading-none tracking-[-0.05em] md:text-4xl">
                    {readString(block.data.projectValue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/45">
                    {readString(block.data.partnerLabel)}
                  </p>
                  <p className="mt-3 font-serif text-3xl leading-none tracking-[-0.05em] md:text-4xl">
                    {readString(block.data.partnerValue)}
                  </p>
                </div>
              </div>
            </div>

            {primaryMedia.src ? (
              <BlitMediaPanel
                media={primaryMedia}
                className="h-[72vh] min-h-[420px]"
              />
            ) : null}
          </div>

          {(secondaryMedia.src || summaryParagraphs.length > 0) ? (
            <div className="mt-16 space-y-10">
              {secondaryMedia.src ? (
                <BlitMediaPanel
                  media={secondaryMedia}
                  className="h-[60vh] min-h-[320px]"
                />
              ) : null}

              {summaryParagraphs.length > 0 ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  {summaryParagraphs.map((paragraph, index) => (
                    <p
                      key={`${block.id}-intro-${index}`}
                      className="text-base leading-relaxed text-black/72"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </BlitSection>
      );
    }
    case "blitCaseStudyHighlights": {
      const stories = readObjectArray<StringRecord>(block.data.stories);
      const mediaItems = readCaseStudyMediaItems(block.data.media);
      const leadStories = stories.slice(0, 2);
      const trailingStories = stories.slice(2);

      return (
        <BlitSection key={block.id}>
          {leadStories.length > 0 ? (
            <div className="grid gap-10 lg:grid-cols-2">
              {leadStories.map((story, index) => (
                <article key={`${block.id}-lead-${index}`} className="border-t border-black/10 pt-5">
                  <h2 className="font-serif text-4xl leading-none tracking-[-0.05em] md:text-5xl">
                    {readString(story.title)}
                  </h2>
                  <p className="mt-5 max-w-2xl text-sm leading-relaxed text-black/68 md:text-base">
                    {readString(story.body)}
                  </p>
                </article>
              ))}
            </div>
          ) : null}

          {mediaItems.length > 0 ? (
            <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
              {mediaItems.map((media, index) => (
                <BlitMediaPanel
                  key={`${block.id}-media-${index}`}
                  media={media}
                  className={
                    index === 0
                      ? "h-[72vh] min-h-[420px] md:col-span-2 lg:col-span-1 lg:row-span-2"
                      : "h-80 min-h-[260px]"
                  }
                />
              ))}
            </div>
          ) : null}

          {trailingStories.length > 0 ? (
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {trailingStories.map((story, index) => (
                <article key={`${block.id}-trail-${index}`} className="border-t border-black/10 pt-5">
                  <h3 className="font-serif text-3xl leading-none tracking-[-0.04em] md:text-4xl">
                    {readString(story.title)}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-black/68 md:text-base">
                    {readString(story.body)}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </BlitSection>
      );
    }
    case "blitCaseStudyTechnical": {
      const paragraphs = readStringArray(block.data.paragraphs);
      const mediaItems = readCaseStudyMediaItems(block.data.media);

      return (
        <BlitSection key={block.id}>
          <BlitLabel>{readString(block.data.heading) || "System logic"}</BlitLabel>
          <div className="grid gap-8 lg:grid-cols-2">
            {paragraphs.map((paragraph, index) => (
              <p
                key={`${block.id}-paragraph-${index}`}
                className="text-base leading-relaxed text-black/72"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {mediaItems.length > 0 ? (
            <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mediaItems.map((media, index) => (
                <BlitMediaPanel
                  key={`${block.id}-tech-media-${index}`}
                  media={media}
                  className={index === 0 ? "h-[68vh] min-h-[360px] lg:col-span-2" : "h-80 min-h-[260px]"}
                />
              ))}
            </div>
          ) : null}
        </BlitSection>
      );
    }
    case "blitCaseStudyCredits": {
      const team = readStringArray(block.data.team);
      return (
        <BlitSection key={block.id} className="pb-20 pt-24">
          <BlitLabel>{readString(block.data.heading) || "The blit. team"}</BlitLabel>
          <p className="max-w-6xl font-serif text-[9vw] leading-[0.9] tracking-[-0.06em] md:text-5xl lg:text-6xl">
            {team.join(" / ")}
          </p>
        </BlitSection>
      );
    }
    case "blitWorksIndex": {
      const projects = readObjectArray<StringRecord>(block.data.projects);
      const filters = readStringArray(block.data.filters);
      return <BlitWorksIndexSection key={block.id} block={block} projects={projects} filters={filters} />;
    }
    case "blitStudioHero":
      return (
        <BlitSection key={block.id} className="flex min-h-[70vh] items-end pt-32">
          <div className="grid w-full gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <BlitLabel>Blit Studio</BlitLabel>
              <h1 className="font-serif text-[18vw] leading-[0.82] tracking-[-0.08em] md:text-8xl lg:text-[9vw]">{readString(block.data.title)}</h1>
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-black/65 md:text-base">{readString(block.data.subtitle)}</p>
            </div>
            <div className="group h-80 overflow-hidden rounded-[14px] bg-black/10" data-blit-cursor="media" data-blit-cursor-label="View">
              <BlitMedia src={readString(block.data.imageUrl)} alt={readString(block.data.title)} className="h-full w-full" />
            </div>
          </div>
        </BlitSection>
      );
    case "blitContactHero":
      return <BlitContactPageSection key={block.id} heroBlock={block} allBlocks={allBlocks} />;
    case "blitManifesto":
      return (
        <BlitSection key={block.id}>
          <BlitLabel>{readString(block.data.heading) || "Manifesto"}</BlitLabel>
          <div className="grid gap-3">
            {readStringArray(block.data.items).map((item, index) => (
              <p key={`${block.id}-${index}`} className="border-t border-black/10 py-5 font-serif text-4xl leading-none tracking-[-0.05em] md:text-6xl">
                {String(index + 1).padStart(2, "0")} / {item}
              </p>
            ))}
          </div>
        </BlitSection>
      );
    case "blitContactGrid":
      if (allBlocks.some((entry) => entry.type === "blitContactHero")) {
        return null;
      }

      return (
        <BlitSection key={block.id}>
          <div className="grid gap-4 md:grid-cols-3">
            {readObjectArray<{ title?: unknown; contacts?: unknown }>(block.data.groups).map((group, index) => (
              <article key={`${block.id}-${index}`} className="rounded-[12px] bg-white p-5">
                <BlitLabel>{readString(group.title)}</BlitLabel>
                <div className="space-y-5">
                  {readObjectArray<{ name?: unknown; role?: unknown; email?: unknown; phone?: unknown }>(group.contacts).map((contact, contactIndex) => (
                    <div key={`${block.id}-${index}-${contactIndex}`}>
                      <p className="font-bold">{readString(contact.name)}</p>
                      <p className="text-sm text-black/55">{readString(contact.role)}</p>
                      <p className="mt-2 text-sm">{readString(contact.email)}</p>
                      <p className="text-sm text-black/55">{readString(contact.phone)}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </BlitSection>
      );
    case "blitOffices":
      if (allBlocks.some((entry) => entry.type === "blitContactHero")) {
        return null;
      }

      return (
        <BlitSection key={block.id}>
          <BlitLabel>{readString(block.data.heading) || "Offices"}</BlitLabel>
          <div className="grid gap-4 md:grid-cols-2">
            {readObjectArray<{ name?: unknown; phone?: unknown; address?: unknown }>(block.data.offices).map((office, index) => (
              <article key={`${block.id}-${index}`} className="rounded-[12px] bg-white p-6">
                <h3 className="font-serif text-4xl tracking-[-0.04em]">{readString(office.name)}</h3>
                <p className="mt-4 text-sm text-black/60">{readString(office.phone)}</p>
                <p className="text-sm text-black/60">{readString(office.address)}</p>
              </article>
            ))}
          </div>
        </BlitSection>
      );
    case "blitArticleGrid":
      return (
        <BlitSection key={block.id}>
          <BlitLabel>{readString(block.data.heading) || "Unfolded"}</BlitLabel>
          <div className="grid gap-4 md:grid-cols-3">
            {readObjectArray<StringRecord>(block.data.articles).map((article, index) => (
              <BlitProjectCard key={`${block.id}-${index}`} project={article} index={index} compact />
            ))}
          </div>
        </BlitSection>
      );
    default:
      return null;
  }
}

export function BlitPageExperience({ page, blocks }: BlitPageExperienceProps) {
  useEffect(() => {
    document.body.classList.add("blit-public-page");

    const revealNodes = Array.from(document.querySelectorAll(".blit-reveal"));
    const revealIfInViewport = (node: Element) => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.88 && rect.bottom > window.innerHeight * 0.08) {
        node.classList.add("blit-reveal-visible");
      }
    };

    if (typeof IntersectionObserver === "undefined") {
      revealNodes.forEach((node) => node.classList.add("blit-reveal-visible"));
      return () => {
        document.body.classList.remove("blit-public-page", "blit-menu-open");
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("blit-reveal-visible");
          }
        });
      },
      { threshold: 0.12 }
    );

    revealNodes.forEach((node) => {
      observer.observe(node);
      revealIfInViewport(node);
    });

    return () => {
      document.body.classList.remove("blit-public-page", "blit-menu-open");
      observer.disconnect();
    };
  }, [blocks]);

  const visibleBlocks = blocks.filter((block) => block.data.hidden !== true);

  return (
    <div className="min-h-screen bg-[#f2eee4] text-[#15130f]">
      <BlitNavigation />
      <PageBreadcrumbs page={page} variant="blit" />
      <BlitCustomCursor />
      {visibleBlocks.map((block) => renderBlitBlock(block, visibleBlocks))}
      <BlitFooter />
    </div>
  );
}
