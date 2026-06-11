import { ArrowUpRight } from "lucide-react";

import { SiteScopedLink } from "../components/SiteScopedLink";
import { useWorkPublicCatalog } from "../hooks/useWorkPublicCatalog";

export function Work() {
  const { meta, tagPills, projects, activeTagSlug, setActiveTagSlug, loading, error } =
    useWorkPublicCatalog();

  return (
    <div className="min-h-screen bg-black pt-28 pb-20 text-white">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
        <header className="mb-10 border-b border-white/10 pb-8">
          <h1 className="font-serif text-5xl leading-tight md:text-6xl lg:text-7xl">
            {meta.title}
          </h1>
          {meta.subtitle ? (
            <p className="mt-4 max-w-3xl text-lg text-white/70">{meta.subtitle}</p>
          ) : null}
        </header>

        <section className="mb-8 flex flex-wrap gap-2">
          {tagPills.map((tag) => {
            const selected = activeTagSlug === (tag.slug ?? null);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setActiveTagSlug(tag.slug ?? null)}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                  selected
                    ? "border-white bg-white text-black"
                    : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                }`}
              >
                {tag.name}
              </button>
            );
          })}
        </section>

        {loading ? (
          <p className="text-sm text-white/60">Loading projects...</p>
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-white/60">No projects found for this filter.</p>
        ) : (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <SiteScopedLink
                key={project.id}
                to={`/work/${project.slug}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-colors hover:border-white/30"
              >
                <div className="aspect-[4/3] overflow-hidden bg-black/30">
                  {project.coverImage ? (
                    <img
                      src={project.coverImage}
                      alt={project.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.3em] text-white/40">
                      No Cover
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-serif text-3xl leading-tight text-white">
                    <span className="inline-flex items-center gap-2">
                      {project.title || "(Untitled)"}
                      <ArrowUpRight className="h-5 w-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </span>
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm text-white/65">{project.excerpt}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase tracking-widest text-white/60"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              </SiteScopedLink>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
