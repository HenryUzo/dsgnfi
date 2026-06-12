import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronLeft, ChevronRight, ArrowDownRight } from 'lucide-react';
import { SiteScopedLink } from '../components/SiteScopedLink';

gsap.registerPlugin(ScrollTrigger);

const commandments = [
  {
    title: 'Make It Better',
    description: "We're on a quest to vanquish mediocrity. We honor our craft by striving for excellence on every single project — consistently raising the bar for ourselves and the people we serve.",
  },
  {
    title: 'Question Everything',
    description: 'We challenge convention by thinking beyond industry standards. We approach every task and project with a childlike curiosity to understand its unique challenges, and we don\'t stop until it\'s perfect.',
  },
  {
    title: 'Collaboration Over Competition',
    description: "We're team players. We work in lockstep with our partners and each other to develop well-vetted solutions seasoned with diverse perspectives.",
  },
  {
    title: 'Less Is More',
    description: 'Simple ideas stick. We eliminate unnecessary complexity to make it easy for people to understand and relate to what makes each brand uniquely special.',
  },
  {
    title: 'Extreme Ownership',
    description: 'Greatness requires great responsibility. Success is achieved when we treat every task and project as if it were our own. We say what we\'ll do and do what way say.',
  },
];

const teamMembers = [
  { name: 'Young', role: 'Graphic Gladiator', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop' },
  { name: 'German', role: 'UI Unicorn', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=500&fit=crop' },
  { name: 'André', role: 'Process Pilot', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop' },
  { name: 'Maria', role: 'Strategy Sage', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop' },
  { name: 'Diego', role: 'Type Traveler', image: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=500&fit=crop' },
  { name: 'Diogo', role: 'Motion Maverick', image: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=500&fit=crop' },
  { name: 'Kathy', role: 'Creative Captain', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop' },
  { name: 'Rani', role: 'Brand Builder', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop' },
];

const gallerySlides = [
  { title: 'Future of Finance Summit', location: 'Beijing, China', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=800&fit=crop' },
  { title: 'Brand Week', location: 'New York, USA', image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=800&fit=crop' },
  { title: 'Design Conference', location: 'London, UK', image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&h=800&fit=crop' },
  { title: 'Creative Summit', location: 'Tokyo, Japan', image: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=1200&h=800&fit=crop' },
  { title: 'Brand Awards', location: 'Berlin, Germany', image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&h=800&fit=crop' },
  { title: 'Strategy Workshop', location: 'Sydney, Australia', image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=800&fit=crop' },
];

export function Studio() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: 'power3.out' }
      );
    });

    return () => ctx.revert();
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % gallerySlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + gallerySlides.length) % gallerySlides.length);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32">
        {/* Greek collage background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10" />
          <img
            src="https://images.unsplash.com/photo-1555993539-1732b0258235?w=1600&h=900&fit=crop"
            alt="Greek architecture"
            className="w-full h-full object-cover opacity-30"
          />
        </div>

        <div className="relative z-20 w-full px-6 lg:px-12">
          <h1 className="font-serif text-5xl md:text-6xl lg:text-8xl text-white max-w-4xl">
            A brand rooted in storytelling.
          </h1>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-32">
        <div className="w-full px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-white/40 mb-4 block">
                More Than a Name
              </span>
              <p className="text-xl md:text-2xl text-white/80 leading-relaxed">
                We found inspiration for our name in Attica, a region of Ancient Greece encompassing 
                the city of Athens. The Attics were revered as clever storytellers who charmed audiences 
                with their refined, delicate wit, a trait that came to be known as Attic Salt. This 
                concept—sparkling thought, well expressed—is the guiding principle in our creative process.
              </p>
              <SiteScopedLink
                to="/insights/our-name-story"
                className="inline-flex items-center gap-2 mt-8 text-white/60 hover:text-white transition-colors"
              >
                <ArrowDownRight className="w-5 h-5" />
                <span className="text-sm uppercase tracking-wider">Read more</span>
              </SiteScopedLink>
            </div>

            {/* Gallery Carousel */}
            <div className="relative">
              <div className="overflow-hidden rounded-2xl">
                <div
                  className="flex transition-transform duration-500"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {gallerySlides.map((slide, index) => (
                    <div key={index} className="w-full flex-shrink-0">
                      <div className="relative aspect-[4/3]">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-6 left-6">
                          <span className="text-white font-medium">{slide.title}</span>
                          <span className="text-white/60 text-sm ml-2">{slide.location}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevSlide}
                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white transition-all duration-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white transition-all duration-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-white/40 text-sm">
                  {currentSlide + 1} / {gallerySlides.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-32">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-4xl">
            <p className="text-3xl md:text-4xl lg:text-5xl text-white leading-tight">
              A powerful brand identity has the capacity to transform a business, 
              disrupt industries, build community, and shape the future.
            </p>
            <p className="text-white/60 mt-8 text-lg leading-relaxed">
              That's why our team is obsessed with human behavior, design, and its impact on organizations. 
              We're a diverse team of empathetic creatives that create positive change for a living. We 
              surround ourselves with people and projects that honor our values and push the world forward.
            </p>
          </div>
        </div>
      </section>

      {/* Brand Commandments */}
      <section className="py-32">
        <div className="w-full px-6 lg:px-12">
          <h2 className="font-serif text-5xl md:text-6xl text-white mb-16">
            Our brand commandments
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            {commandments.map((cmd, index) => (
              <div key={cmd.title} className={index % 2 === 1 ? 'md:mt-16' : ''}>
                <h3 className="font-serif text-3xl text-white mb-4">{cmd.title}</h3>
                <p className="text-white/60 leading-relaxed">{cmd.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-32">
        <div className="w-full px-6 lg:px-12">
          <h2 className="font-serif text-5xl md:text-6xl text-white mb-16">
            Meet the Attics
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <div key={member.name} className="group">
                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="text-white font-medium">{member.name}</h3>
                <p className="text-white/60 text-sm">{member.role}</p>
              </div>
            ))}
          </div>

          {/* Careers CTA */}
          <div className="mt-20 text-center">
            <p className="text-white/60 text-xl mb-6">Can you imagine yourself here?</p>
            <SiteScopedLink
              to="/careers"
              className="inline-flex items-center px-8 py-3 bg-[var(--brand)] text-white rounded-full hover:bg-[var(--brand-dark)] transition-colors duration-300"
            >
              View Careers
            </SiteScopedLink>
          </div>
        </div>
      </section>
    </div>
  );
}

