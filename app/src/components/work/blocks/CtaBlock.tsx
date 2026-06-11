import { readString } from "./blockUtils";
import { SiteScopedLink } from "../../SiteScopedLink";

type CtaBlockProps = {
  data: Record<string, unknown>;
  variant?: string;
  showFrame?: boolean;
  flushX?: boolean;
};

function isExternal(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function CtaBlock({
  data,
  variant,
  showFrame = true,
  flushX = false,
}: CtaBlockProps) {
  const title = readString(data.title, "Ready for what comes next?");
  const description = readString(data.description);
  const primaryLabel = readString(data.primaryLabel, "Contact");
  const primaryHref = readString(data.primaryHref, "/contact");
  const secondaryLabel = readString(data.secondaryLabel);
  const secondaryHref = readString(data.secondaryHref);
  const isProcess = variant === "process";

  if (isProcess) {
    return (
      <section
        className={`rounded-2xl border border-white/15 bg-black/60 ${
          flushX ? "py-8 px-0 md:py-10 md:px-0" : "p-8 md:p-12"
        }`}
      >
        <h3 className="font-serif text-4xl leading-tight text-white md:text-5xl">{title}</h3>
        {description ? <p className="mt-3 max-w-2xl text-white/70">{description}</p> : null}
        <div className="mt-6 flex items-center justify-between">
          {isExternal(primaryHref) ? (
            <a
              href={primaryHref}
              target="_blank"
              rel="noreferrer"
              className="text-xs uppercase tracking-[0.3em] text-white/70 hover:text-white"
            >
              {primaryLabel}
            </a>
          ) : (
            <SiteScopedLink
              to={primaryHref}
              className="text-xs uppercase tracking-[0.3em] text-white/70 hover:text-white"
            >
              {primaryLabel}
            </SiteScopedLink>
          )}
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white/70">
            ↗
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl bg-[var(--brand)] text-white ${
        showFrame ? "border border-white/10" : ""
      } ${flushX ? "py-8 px-0 md:py-10 md:px-0" : "p-8 md:p-10"}`}
    >
      <h3 className="font-serif text-4xl leading-tight">{title}</h3>
      {description ? <p className="mt-3 max-w-2xl text-white/80">{description}</p> : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isExternal(primaryHref) ? (
          <a
            href={primaryHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white px-5 py-2 text-xs uppercase tracking-widest text-black"
          >
            {primaryLabel}
          </a>
        ) : (
          <SiteScopedLink
            to={primaryHref}
            className="rounded-full bg-white px-5 py-2 text-xs uppercase tracking-widest text-black"
          >
            {primaryLabel}
          </SiteScopedLink>
        )}

        {secondaryLabel && secondaryHref ? (
          isExternal(secondaryHref) ? (
            <a
              href={secondaryHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/40 px-5 py-2 text-xs uppercase tracking-widest text-white"
            >
              {secondaryLabel}
            </a>
          ) : (
            <SiteScopedLink
              to={secondaryHref}
              className="rounded-full border border-white/40 px-5 py-2 text-xs uppercase tracking-widest text-white"
            >
              {secondaryLabel}
            </SiteScopedLink>
          )
        ) : null}
      </div>
    </section>
  );
}
