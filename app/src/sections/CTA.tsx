import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDownRight } from 'lucide-react';
import { SiteScopedLink } from '../components/SiteScopedLink';
import { useCmsSection } from '../hooks/useCmsSection';

gsap.registerPlugin(ScrollTrigger);

const fallbackCta = {
  title: 'Ready to start a project?\nLet us help you move next.',
  primaryLabel: "Let's Chat",
  primaryHref: '/contact',
  secondaryLabel: 'View Work',
  secondaryHref: '/work',
  visible: true,
};

type CtaData = typeof fallbackCta;

function isExternal(href: string) {
  return href.startsWith('http');
}

export function CTA() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { data } = useCmsSection<CtaData>('home', 'cta', fallbackCta);

  const cta = data ?? fallbackCta;

  if (cta.visible === false) {
    return null;
  }
  const titleLines = useMemo(() => (cta.title || fallbackCta.title).split('\n'), [cta.title]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-black py-32">
      <div className="w-full px-6 lg:px-12">
        <div
          ref={cardRef}
          className="group relative bg-[var(--brand)] rounded-3xl p-10 md:p-16 overflow-hidden transition-all duration-500 hover:bg-[var(--brand-dark)]"
        >
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div>
              <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl text-white leading-tight">
                {titleLines.map((line, index) => (
                  <span key={`${line}-${index}`}>
                    {line}
                    {index < titleLines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </h2>
            </div>
            <div className="flex flex-col items-start gap-4">
              {isExternal(cta.primaryHref) ? (
                <a
                  href={cta.primaryHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4"
                >
                  <span className="text-white/80 text-lg uppercase tracking-wider">
                    {cta.primaryLabel}
                  </span>
                  <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-300">
                    <ArrowDownRight className="w-5 h-5 text-white group-hover:text-[var(--brand)] transition-colors duration-300" />
                  </div>
                </a>
              ) : (
                <SiteScopedLink to={cta.primaryHref} className="flex items-center gap-4">
                  <span className="text-white/80 text-lg uppercase tracking-wider">
                    {cta.primaryLabel}
                  </span>
                  <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-300">
                    <ArrowDownRight className="w-5 h-5 text-white group-hover:text-[var(--brand)] transition-colors duration-300" />
                  </div>
                </SiteScopedLink>
              )}
              {isExternal(cta.secondaryHref) ? (
                <a
                  href={cta.secondaryHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/70 text-sm uppercase tracking-widest hover:text-white"
                >
                  {cta.secondaryLabel}
                </a>
              ) : (
                <SiteScopedLink
                  to={cta.secondaryHref}
                  className="text-white/70 text-sm uppercase tracking-widest hover:text-white"
                >
                  {cta.secondaryLabel}
                </SiteScopedLink>
              )}
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        </div>
      </div>
    </section>
  );
}

