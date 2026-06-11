import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCmsSection } from '../hooks/useCmsSection';

gsap.registerPlugin(ScrollTrigger);

const fallbackTestimonials = {
  title: 'Testimonials',
  visible: true,
  items: [
    {
      quote:
        'Of all the experienced agencies I have worked with, AtticSalt stood out in their competence and understanding of the subject matter and backed it up with solid execution.',
      author: 'Srini Vasan',
      role: 'CEO, Pawgo',
      color: '#1a4ce0',
    },
    {
      quote:
        "Going through the full rebranding process has been the biggest/most challenging project during my 7-year career at Edustaff. Your team made the transition smooth, seamless and gave our company the sophisticated 'face-lift' we needed. We are so grateful to Attic Salt.",
      author: 'Angeline Noble',
      role: 'Marketing Director, Edustaff',
      color: '#ffffff',
    },
    {
      quote: "From the logo to the language, we absolutely love everything. Y'all kick ass!",
      author: 'Brandi Eppolito',
      role: 'VP of Marketing, Propello',
      color: '#ffffff',
    },
    {
      quote:
        "I've really been blown away by this entire process, the software you're using just puts all the comments we've been talking about into something we can see and feel.",
      author: 'Michael Eck',
      role: 'CMO, Credit Union 1',
      color: '#1a4ce0',
    },
  ],
};

type TestimonialsData = typeof fallbackTestimonials;

export function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { data } = useCmsSection<TestimonialsData>(
    'home',
    'testimonials',
    fallbackTestimonials
  );

  const testimonials = data ?? fallbackTestimonials;

  useEffect(() => {
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [testimonials.visible, testimonials.items?.length, testimonials.title]);

  useEffect(() => {
    if (testimonials.visible === false) return;

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

      const cards = cardsRef.current?.querySelectorAll('.testimonial-card');
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
  }, [testimonials.visible, testimonials.items?.length, testimonials.title]);

  if (testimonials.visible === false) {
    return null;
  }

  const resolveCardColor = (input: string) => {
    const normalized = input.trim().toLowerCase();
    if (normalized === '#1a4ce0') {
      return 'var(--brand)';
    }
    return input;
  };

  const isLightCard = (input: string) => input.trim().toLowerCase() === '#ffffff';

  return (
    <section ref={sectionRef} className="bg-black py-32">
      <div className="w-full px-6 lg:px-12">
        {/* Header */}
        <div ref={headerRef} className="mb-16">
          <h2 className="font-serif text-5xl md:text-6xl text-white">
            {testimonials.title}
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(testimonials.items ?? []).map((testimonial, index) => (
            <div
              key={`${testimonial.author}-${index}`}
              className="testimonial-card rounded-2xl p-8 md:p-10"
              style={{
                backgroundColor: isLightCard(testimonial.color)
                  ? '#ffffff'
                  : resolveCardColor(testimonial.color),
                color: isLightCard(testimonial.color) ? '#000000' : '#ffffff',
              }}
            >
              <p className="text-xl md:text-2xl leading-relaxed mb-8">
                "{testimonial.quote}"
              </p>
              <div>
                <p className="font-medium">{testimonial.author}</p>
                <p
                  className={`${
                    isLightCard(testimonial.color)
                      ? 'text-black/60'
                      : 'text-white/60'
                  }`}
                >
                  {testimonial.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
