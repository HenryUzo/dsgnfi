import { readString } from "./blockUtils";
import { SiteScopedLink } from "../../SiteScopedLink";

type ProcessCtaOutlineBlockProps = {
  data: Record<string, unknown>;
};

function isExternal(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function ProcessCtaOutlineBlock({ data }: ProcessCtaOutlineBlockProps) {
  const title = readString(data.title, "Ready to start a project?");
  const linkLabel = readString(data.linkLabel, "LET'S CHAT");
  const href = readString(data.href, "/contact");

  return (
    <section className="relative bg-black px-6 py-20 md:px-12 md:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_20%_60%,rgba(20,80,255,0.55),transparent_55%)] blur-[140px]" />
      </div>
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="rounded-3xl border border-white/15 bg-black/70 px-8 py-10 md:px-12 md:py-12">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <h3 className="max-w-xl whitespace-pre-line font-serif text-4xl leading-tight text-white md:text-5xl">
                {title}
              </h3>
              <div className="mt-8">
                {isExternal(href) ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs uppercase tracking-[0.3em] text-white/60 hover:text-white"
                  >
                    {linkLabel}
                  </a>
                ) : (
                  <SiteScopedLink
                    to={href}
                    className="text-xs uppercase tracking-[0.3em] text-white/60 hover:text-white"
                  >
                    {linkLabel}
                  </SiteScopedLink>
                )}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 text-white/70">
              {"\u2198"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

