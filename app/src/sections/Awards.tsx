import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Plus, Minus } from 'lucide-react';
import { useCmsSection } from '../hooks/useCmsSection';

gsap.registerPlugin(ScrollTrigger);

const fallbackAwards = {
  eyebrow: 'Nationally Recognized',
  title: 'Trailblazing craftsmanship that wins hearts and awards.',
  listTitle: 'Latest Awards & Recognition',
  visible: true,
  items: [
    { year: '2025', title: 'Top 50 Global Branding Agencies', org: '50pros' },
    { year: '2025', title: '2x Gold Addy (AAF)', org: 'Tempe Tourism Identity & Website' },
    { year: '2025', title: '2x Gold Addy', org: 'PHXDW Identity & Website' },
    { year: '2025', title: '2x Silver Addy', org: 'Zanda Brand & Motion Identity' },
    { year: '2025', title: 'Silver Addy', org: 'Solera Brand Identity' },
    { year: '2025', title: '3x AMA Awards', org: 'Tempe Tourism Logo/Identity/Website' },
    { year: '2024', title: 'Top 50 Global Branding Agencies', org: '50pros' },
    { year: '2024', title: '2x Gold Addy (AAF)', org: 'Bond Brand Identity' },
    { year: '2024', title: 'Gold Addy (AAF)', org: 'Attic Salt Website' },
    { year: '2024', title: 'Gold Addy (AAF)', org: 'Tacos & Craft Illustration' },
    { year: '2023', title: 'Spotted on Brand New', org: 'The Intelligence Rebrand' },
    { year: '2023', title: 'Spotted on Brand New', org: 'Featured Rebrand' },
    { year: '2023', title: 'Top 50 Global Branding Agencies', org: '50pros' },
    { year: '2023', title: 'Gold Addy (AAF)', org: 'FreeSpade Brand Identity' },
    { year: '2023', title: 'Gold Addy (AAF)', org: 'Attic Salt Motion Reel' },
    { year: '2023', title: 'Silver Addy (AAF)', org: 'Guestie Web Experience' },
    { year: '2023', title: 'Gold District Addy (AAF)', org: 'Attic Salt Motion Reel' },
    { year: '2023', title: 'Top Branding Agency in the United States', org: 'Clutch' },
    { year: '2023', title: 'Branding Excellence Award', org: 'UpCity' },
  ],
};

type AwardsData = typeof fallbackAwards;

export function Awards() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { data } = useCmsSection<AwardsData>('home', 'awards', fallbackAwards);

  const awardsData = data ?? fallbackAwards;

  useEffect(() => {
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [awardsData.visible, awardsData.items?.length, awardsData.title]);

  useEffect(() => {
    if (awardsData.visible === false) return;

    const ctx = gsap.context(() => {
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
    }, sectionRef);

    return () => ctx.revert();
  }, [awardsData.visible]);

  if (awardsData.visible === false) {
    return null;
  }

  return (
    <section ref={sectionRef} className="bg-black py-32">
      <div className="w-full px-6 lg:px-12">
        {/* Header */}
        <div ref={headerRef} className="mb-16">
          <span className="text-xs font-medium uppercase tracking-wider text-white/40 mb-4 block">
            {awardsData.eyebrow}
          </span>
          <h2 className="font-serif text-5xl md:text-6xl text-white max-w-3xl">
            {awardsData.title}
          </h2>
        </div>

        {/* Awards Accordion */}
        <div className="border-t border-white/10">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-6 flex items-center justify-between group"
          >
            <span className="text-white/60 group-hover:text-white transition-colors duration-300 flex items-center gap-3">
              {isExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {awardsData.listTitle}
            </span>
          </button>

          <div
            className={`overflow-hidden transition-all duration-500 ${
              isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-4">
              {(awardsData.items ?? []).map((award, index) => (
                <div
                  key={`${award.year}-${award.title}-${index}`}
                  className="flex items-start gap-4 py-3 border-b border-white/5"
                >
                  <span className="text-white/40 text-sm w-12 flex-shrink-0">
                    {award.year}
                  </span>
                  <div>
                    <span className="text-white text-sm">{award.title}</span>
                    <span className="text-white/40 text-sm ml-2">- {award.org}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
