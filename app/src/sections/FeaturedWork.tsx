import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import { SiteScopedLink } from '../components/SiteScopedLink';
import {
  getWorkPublicProjects,
  type WorkPublicProject,
} from '../services/workPublic';
import { useCmsSection } from '../hooks/useCmsSection';

gsap.registerPlugin(ScrollTrigger);

const featuredProjects = [
  {
    id: 'loudspectrum',
    title: 'Loudspectrum',
    category: 'Branding',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=600&fit=crop',
    color: '#d4a574',
  },
  {
    id: 'tempe-tourism',
    title: 'Tempe Tourism',
    category: 'Branding, Web',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop',
    color: '#4a5568',
  },
  {
    id: 'smartscrubs',
    title: 'SmartScrubs',
    category: 'Packaging',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
    color: '#f56565',
  },
];

const defaultConfig = {
  title: 'Featured Work',
  description:
    'WARNING: (1) SIDE EFFECTS OF ATTIC SALT MAY INCLUDE RAPID GROWTH, DANGEROUS LEVELS OF DIFFERENTIATION, AND MIND-BLOWING CLARITY. (2) WORKING WITH ATTIC SALT IMPAIRS YOUR ABILITY TO BE INVISIBLE AND MAY POSE A THREAT TO THE COMPETITION.',
  count: 3,
  order: 'latest' as 'latest' | 'manual',
  manualSlugs: [] as string[],
};

export function FeaturedWork() {
  const { data: config } = useCmsSection('home', 'featuredWork', defaultConfig);
  const [projects, setProjects] = useState<WorkPublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoading(true);
      setError(null);
      try {
        const data = await getWorkPublicProjects();
        if (!cancelled) {
          setProjects(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load featured work.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const featured = useMemo(() => {
    const sectionConfig = config ?? defaultConfig;
    const count = Math.max(1, Math.min(6, sectionConfig.count ?? defaultConfig.count));
    const order = sectionConfig.order ?? defaultConfig.order;
    const manualSlugs = sectionConfig.manualSlugs ?? defaultConfig.manualSlugs;

    if (projects.length > 0) {
      if (order === 'manual' && manualSlugs.length > 0) {
        const bySlug = new Map(projects.map((project) => [project.slug, project]));
        const ordered = manualSlugs
          .map((slug) => bySlug.get(slug))
          .filter((project): project is WorkPublicProject => Boolean(project));
        const orderedSlugs = new Set(ordered.map((project) => project.slug));
        const remaining = projects.filter((project) => !orderedSlugs.has(project.slug));
        return [...ordered, ...remaining].slice(0, count);
      }
      return projects.slice(0, count);
    }
    return featuredProjects.slice(0, count);
  }, [projects, config]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Projects animation
      const projects = projectsRef.current?.querySelectorAll('.project-item');
      projects?.forEach((project, index) => {
        gsap.fromTo(
          project,
          { opacity: 0, y: 80 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: project,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
            delay: index * 0.15,
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [featured.length]);

  return (
    <section ref={sectionRef} className="bg-black py-32">
      <div className="w-full px-6 lg:px-12">
        {/* Header */}
        <div ref={headerRef} className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-16">
          <h2 className="font-serif text-5xl md:text-6xl text-white">
            {config?.title ?? defaultConfig.title}
          </h2>
          <p className="text-white/60 max-w-md text-lg">
            {config?.description ?? defaultConfig.description}
          </p>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <p className="text-sm text-white/60">Loading featured work...</p>
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : featured.length === 0 ? (
          <p className="text-sm text-white/60">No projects published yet.</p>
        ) : (
          <div ref={projectsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {featured.map((project, index) => {
              const isThird = index === 2;
              const cardClass = isThird
                ? 'project-item group relative aspect-[21/9] lg:col-span-2 rounded-2xl overflow-hidden'
                : 'project-item group relative aspect-[4/3] lg:aspect-[16/10] rounded-2xl overflow-hidden';
              const tagsLabel =
                'tags' in project
                  ? project.tags.map((tag) => tag.name).join(', ')
                  : (project as (typeof featuredProjects)[number]).category;
              const cover =
                'coverImage' in project
                  ? project.coverImage
                  : (project as (typeof featuredProjects)[number]).image;
              const slug =
                'slug' in project
                  ? project.slug
                  : (project as (typeof featuredProjects)[number]).id;
              const title =
                'title' in project
                  ? project.title
                  : (project as (typeof featuredProjects)[number]).title;

              return (
                <SiteScopedLink key={slug} to={`/work/${slug}`} className={cardClass}>
                  <img
                    src={cover}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <span className="text-white/60 text-sm mb-2 block">
                      {tagsLabel}
                    </span>
                    <h3 className="font-serif text-3xl text-white flex items-center gap-3">
                      {title}
                      <ArrowUpRight className="w-6 h-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </h3>
                  </div>
                </SiteScopedLink>
              );
            })}
          </div>
        )}

        {/* View All Link */}
        <div className="mt-12 flex justify-center">
          <SiteScopedLink
            to="/work"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-300 group"
          >
            <ArrowUpRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
            <span className="text-lg">More Case Studies</span>
          </SiteScopedLink>
        </div>
      </div>
    </section>
  );
}
