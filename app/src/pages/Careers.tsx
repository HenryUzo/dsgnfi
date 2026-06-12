import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, MapPin, Briefcase } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const openPositions = [
  {
    title: 'Senior Brand Designer',
    location: 'Scottsdale, AZ / Remote',
    type: 'Full-time',
    description: "We're looking for a senior brand designer with 5+ years of experience to join our creative team. You'll work on brand identity projects from concept to completion.",
  },
  {
    title: 'Brand Strategist',
    location: 'Scottsdale, AZ',
    type: 'Full-time',
    description: "Help our clients discover their unique positioning and craft compelling brand stories. 3+ years of experience in brand strategy required.",
  },
  {
    title: 'Motion Designer',
    location: 'Remote',
    type: 'Full-time',
    description: "Bring brands to life through motion. We're seeking a talented motion designer to create dynamic brand expressions and animations.",
  },
  {
    title: 'Copywriter',
    location: 'Scottsdale, AZ / Remote',
    type: 'Full-time',
    description: "Craft compelling brand narratives and messaging. We're looking for a wordsmith who can capture brand voices and tell stories that resonate.",
  },
];

const benefits = [
  'Competitive salary',
  'Health, dental, and vision insurance',
  'Unlimited PTO',
  'Remote-friendly work environment',
  'Professional development budget',
  'Home office stipend',
  'Team retreats and events',
  'Parental leave',
];

export function Careers() {
  const heroRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
        }
      );

      const positions = positionsRef.current?.querySelectorAll('.position-card');
      positions?.forEach((position, index) => {
        gsap.fromTo(
          position,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: position,
              start: 'top 85%',
            },
            delay: index * 0.1,
          }
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-white pt-32 pb-20">
      <div className="w-full px-6 lg:px-12">
        {/* Hero */}
        <div ref={heroRef} className="max-w-4xl mb-20">
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-black mb-8">
            Join the Attics
          </h1>
          <p className="text-xl text-black/60 leading-relaxed">
            We're always on the lookout for talented, passionate people who want to create 
            work that matters. If you're obsessed with branding, design, and making a positive 
            impact, we want to hear from you.
          </p>
        </div>

        {/* Open Positions */}
        <div ref={positionsRef} className="mb-20">
          <h2 className="font-serif text-4xl text-black mb-12">Open Positions</h2>
          <div className="space-y-6">
            {openPositions.map((position, index) => (
              <div
                key={index}
                className="position-card group border border-black/10 rounded-2xl p-8 hover:border-black/30 transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="font-serif text-2xl text-black group-hover:text-[var(--brand)] transition-colors mb-2">
                      {position.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-black/60 text-sm mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {position.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {position.type}
                      </span>
                    </div>
                    <p className="text-black/70">{position.description}</p>
                  </div>
                  <button className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full hover:bg-[var(--brand)] transition-colors whitespace-nowrap">
                    Apply Now
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
          <div>
            <h2 className="font-serif text-4xl text-black mb-8">Why Work With Us</h2>
            <p className="text-black/70 text-lg leading-relaxed mb-8">
              At Attic Salt, we believe that great work comes from happy, healthy people. 
              That's why we've built a culture and benefits package that supports you both 
              professionally and personally.
            </p>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop"
                alt="Team"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <h3 className="font-serif text-2xl text-black mb-6">Benefits & Perks</h3>
            <ul className="space-y-4">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3 text-black/70">
                  <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Don't See a Fit */}
        <div className="bg-black rounded-3xl p-10 md:p-16 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">
            Don't see a position that fits?
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">
            We're always interested in meeting talented people. Send us your portfolio 
            and let us know why you'd be a great addition to the team.
          </p>
          <a
            href="mailto:careers@atticsalt.co"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--brand)] text-white rounded-full hover:bg-[var(--brand-dark)] transition-colors"
          >
            Get in Touch
            <ArrowUpRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
}

