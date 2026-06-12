import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCmsSection } from '../hooks/useCmsSection';

gsap.registerPlugin(ScrollTrigger);

const fallbackServices = {
  introTitle: 'Services',
  introText:
    'Attic Salt helps innovative brands navigate organizational change with creativity, clarity, and confidence. We are devoted disciples of behavioral science and specialists in the disciplines of brand creation, expansion, and realignment.',
  visible: true,
  categories: [
    {
      title: 'Strategy',
      items: ['Brand Positioning', 'Brand Platforms', 'Brand Architecture', 'Customer Journey'],
    },
    {
      title: 'Language',
      items: ['Naming', 'Brand Story', 'Voice & Tone', 'Copy & Messaging'],
    },
    {
      title: 'Identity Design',
      items: ['Visual Identity Systems', 'Custom Fonts & Lettering', 'Motion Identity', 'Brand Guidelines'],
    },
    {
      title: 'Launch & Beyond',
      items: ['Web Experience Design', 'User Interface Design', 'Marketing Collateral', 'Brand Campaigns'],
    },
  ],
};

type ServicesData = typeof fallbackServices;

export function Services() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLParagraphElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { data } = useCmsSection<ServicesData>('home', 'services', fallbackServices);
  const servicesData = data ?? fallbackServices;

  if (servicesData.visible === false) {
    return null;
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Intro text animation
      gsap.fromTo(
        introRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: introRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Cards stagger animation
      const cards = cardsRef.current?.querySelectorAll('.service-card');
      cards?.forEach((card, index) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
            delay: index * 0.1,
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-black py-32">
      <div className="w-full px-6 lg:px-12">
        {/* Intro */}
        <div className="mb-20">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-4">
            {servicesData.introTitle ?? fallbackServices.introTitle}
          </p>
          <p
            ref={introRef}
            className="text-xl md:text-2xl text-white/80 max-w-4xl leading-relaxed"
          >
            {servicesData.introText ?? fallbackServices.introText}
          </p>
        </div>

        {/* Services Grid */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {(servicesData.categories ?? fallbackServices.categories).map((service) => (
            <div
              key={service.title}
              className="service-card group"
            >
              <h3 className="text-lg font-medium text-white mb-6 pb-4 border-b border-white/20">
                {service.title}
              </h3>
              <ul className="space-y-3">
                {service.items.map((item) => (
                  <li
                    key={item}
                    className="text-white/60 group-hover:text-white/80 transition-colors duration-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
