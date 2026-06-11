import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useParams, Link } from 'react-router-dom';
import { ArrowUpRight, ArrowLeft } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// Project data
const projectsData: Record<string, {
  title: string;
  subtitle: string;
  category: string;
  heroImage: string;
  description: string;
  sections: {
    title: string;
    content: string;
    image?: string;
  }[];
  gallery: string[];
  nextProject: { title: string; id: string; image: string };
}> = {
  loudspectrum: {
    title: 'Loud Spectrum',
    subtitle: 'A full spectrum brand transformation.',
    category: 'Branding, Naming, Web',
    heroImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1600&h=900&fit=crop',
    description: 'Founded by Chemists in Santa Ana, California, Loud Spectrum pioneered the terpene category. While their products were known for purity and pharmaceutical-grade standards, their clinical brand and complex sub-brands were overshadowed by competitors with stronger presentation and emotional resonance.',
    sections: [
      {
        title: 'Simplifying chaos & amplifying credibility',
        content: 'Beyond the name, the brand\'s structure was also fractured, with each product line having a separate identity, creating unnecessary work. Attic Salt stepped in to bring focus and clarity. Through our proprietary Brand Seasoning® Strategy Framework, we surfaced a crucial insight: the competition was louder, but they lacked substance. Loud Spectrum had an opportunity to go beyond functionality and offer something deeper: a story that moves people, not just product.',
      },
      {
        title: 'A cosmic logo system',
        content: 'Inspired by quasars—the brightest, most energetic objects in the universe— the Loud Spectrum logo system embodies scale, intensity, and discovery, symbolizing molecular innovation with an expanding yet precise form that nods to their scientific expertise. Paired with a sleek, contemporary sans-serif wordmark, the logo balances cosmic energy with modern precision, reflecting a future-forward ethos.',
      },
      {
        title: 'Visual language built for scale',
        content: 'Anchored in the "Beyond Ordinary" creative direction, the visual language used intergalactic themes as a metaphor for Loud Spectrum\'s ambition and flavor intensity. A cosmic gradient palette distinguishes product lines while maintaining brand unity. Adelphi, a sharp yet clean typeface, mirrors the quasar logo geometry.',
      },
      {
        title: 'Bringing order to chaos',
        content: 'The product line was vast—over 200 SKUs across multiple sizes, flavors, and formulas. The previous packaging system struggled to scale, and inconsistent design execution was undermining product perception. We continued the visual identity system across all labels, boxes, and bottles. Each product line received its own color scheme for instant recognition and unified branding.',
      },
      {
        title: 'Redesigning the B2B digital experience',
        content: 'Loud Spectrum\'s old website was built for transactions, not storytelling. Though informative, the brand was lost. We reimagined their digital experience with a B2B customer-centric architecture. Conversion-focused copy, reflecting a confident and elevated brand voice, was created. A modular component system enables their team to build and scale pages efficiently.',
      },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=600&fit=crop',
    ],
    nextProject: {
      title: 'Tempe Tourism',
      id: 'tempe-tourism',
      image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop',
    },
  },
  'tempe-tourism': {
    title: 'Tempe Tourism',
    subtitle: 'New identity for Arizona\'s most culturally diverse city.',
    category: 'Branding, Web',
    heroImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&h=900&fit=crop',
    description: 'Tempe, Arizona is a vibrant desert city known for its rich cultural diversity, thriving arts scene, and outdoor adventures. The city needed a brand identity that captured its unique spirit and positioned it as a must-visit destination in the Southwest.',
    sections: [
      {
        title: 'Capturing the desert spirit',
        content: 'Our challenge was to create a visual identity that honored Tempe\'s natural beauty while celebrating its modern, progressive culture. We drew inspiration from the iconic Arizona landscapes—the dramatic sunsets, the saguaro-dotted horizons, and the warm, welcoming community that calls Tempe home.',
      },
      {
        title: 'A mark that moves',
        content: 'The Tempe Tourism logo features a dynamic "T" monogram that evokes movement and exploration. The geometric form suggests both a compass rose and a sunburst, symbolizing guidance and the warmth of the Arizona sun. The mark is designed to be versatile, working across digital platforms, print materials, and large-scale environmental graphics.',
      },
      {
        title: 'Color palette inspired by the desert',
        content: 'We developed a color system that reflects the natural beauty of the Sonoran Desert. Warm terracotta, dusty rose, and golden hour orange create a palette that feels distinctly Arizona while remaining fresh and contemporary. These colors work harmoniously to evoke the warmth and hospitality that defines Tempe.',
      },
      {
        title: 'Digital-first destination experience',
        content: 'The new Tempe Tourism website was designed to inspire travel and make trip planning effortless. Immersive photography, intuitive navigation, and strategic calls-to-action guide visitors through everything Tempe has to offer—from outdoor adventures to culinary experiences to cultural attractions.',
      },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop',
    ],
    nextProject: {
      title: 'Zanda',
      id: 'zanda',
      image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
    },
  },
  zanda: {
    title: 'Zanda',
    subtitle: 'A buzz worthy new identity for practice management.',
    category: 'Branding, Motion',
    heroImage: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1600&h=900&fit=crop',
    description: 'Zanda is revolutionizing how healthcare practices manage their operations. With a suite of powerful tools for scheduling, billing, and patient management, they needed a brand that communicated innovation, reliability, and a human-centered approach to healthcare technology.',
    sections: [
      {
        title: 'Humanizing healthcare tech',
        content: 'The healthcare technology space is often cold and clinical. Zanda wanted to stand out by putting people first—both the healthcare providers and the patients they serve. Our brand strategy focused on creating an identity that felt approachable, modern, and trustworthy.',
      },
      {
        title: 'The Zanda mark',
        content: 'The Zanda logo is a study in balance and movement. The custom wordmark features subtle geometric adjustments that give it a unique character while maintaining excellent legibility. The "Z" is crafted with a dynamic angle that suggests forward momentum and innovation.',
      },
      {
        title: 'Motion identity',
        content: 'As a tech-forward company, Zanda needed a motion identity that could bring their brand to life across digital touchpoints. We developed a system of fluid animations that reflect the seamless experience of using Zanda\'s platform—from smooth transitions to playful micro-interactions.',
      },
      {
        title: 'A system that scales',
        content: 'Zanda\'s brand system was designed with growth in mind. From the core logo to the extended visual language, every element is built to scale across products, marketing materials, and future brand extensions. The result is a cohesive identity that grows with the company.',
      },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop',
    ],
    nextProject: {
      title: 'SmartScrubs',
      id: 'smartscrubs',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
    },
  },
  smartscrubs: {
    title: 'SmartScrubs',
    subtitle: 'Revolutionizing the way healthcare heroes suit up.',
    category: 'Branding, Packaging',
    heroImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1600&h=900&fit=crop',
    description: 'SmartScrubs demystifies inter-department color coding, simplifies uniform management and streamlines the buying process in order to get healthcare pros back to their most important work.',
    sections: [
      {
        title: 'A little bit tech. And a whole lot of fun.',
        content: 'The new Smart Scrubs logo is delightfully simple and strong. The iconic lettermark is inspired by bright ideas and lightbulb moments — shining light on a new frontier in uniform management.',
      },
      {
        title: 'A visual identity system that celebrates simplicity',
        content: 'After extensive design exploration, we revived and expanded the SmartScrubs visual identity. Inspired by most popular scrub colors, we tested hundreds of options before landing on the final color system. The result is a versatile and vibrant palette that creates a sense of familiarity for industry insiders.',
      },
      {
        title: 'Light rays design system',
        content: 'We expanded the light rays from the \'Smart S\' letter mark into a cohesive design system that injects a little fun and delights into an otherwise mundane and meticulous process.',
      },
      {
        title: 'Packaging that pops',
        content: 'SmartScrubs was hell bent on shaking up the category. To capture the brand\'s unconventional spirit we crafted a bold and delightfully unexpected brand experience. Colorful packaging, lifestyle imagery, and a friendly voice give the identity a warm heartbeat that everyone from healthcare administrators to heart surgeons can fall in love with.',
      },
      {
        title: 'In the know, and on the go',
        content: 'From admin and operating room to analog and digital, the new SmartScrubs brand is dressed to fit the needs of every occasion.',
      },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=600&fit=crop',
    ],
    nextProject: {
      title: 'Loud Spectrum',
      id: 'loudspectrum',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=600&fit=crop',
    },
  },
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const project = id ? projectsData[id] : null;

  useEffect(() => {
    if (!project) return;

    const ctx = gsap.context(() => {
      // Hero animation
      gsap.fromTo(
        heroRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: 'power3.out' }
      );

      // Content sections animation
      const sections = contentRef.current?.querySelectorAll('.project-section');
      sections?.forEach((section) => {
        gsap.fromTo(
          section,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
    });

    return () => ctx.revert();
  }, [project]);

  if (!project) {
    return (
      <div className="min-h-screen bg-black pt-32 pb-20">
        <div className="w-full px-6 lg:px-12">
          <h1 className="font-serif text-5xl text-white">Project not found</h1>
          <Link to="/work" className="text-white/60 hover:text-white mt-4 inline-block">
            ← Back to Work
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section ref={heroRef} className="relative min-h-[80vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={project.heroImage}
            alt={project.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        </div>

        <div className="relative z-10 w-full px-6 lg:px-12 pb-20 pt-32">
          <Link
            to="/work"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-300 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Work
          </Link>

          <span className="text-white/40 text-sm uppercase tracking-wider mb-4 block">
            {project.category}
          </span>
          <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl text-white mb-4">
            {project.title}
          </h1>
          <p className="text-xl md:text-2xl text-white/60 max-w-2xl">
            {project.subtitle}
          </p>
        </div>
      </section>

      {/* Content */}
      <section ref={contentRef} className="py-32">
        <div className="w-full px-6 lg:px-12">
          {/* Introduction */}
          <div className="project-section max-w-4xl mb-32">
            <p className="text-2xl md:text-3xl text-white/80 leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-32">
            {project.sections.map((section, index) => (
              <div
                key={index}
                className={`project-section grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <h2 className="font-serif text-4xl md:text-5xl text-white mb-6">
                    {section.title}
                  </h2>
                  <p className="text-white/60 text-lg leading-relaxed">
                    {section.content}
                  </p>
                </div>
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                    <img
                      src={project.gallery[index % project.gallery.length]}
                      alt={section.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Gallery Grid */}
          <div className="project-section mt-32">
            <h2 className="font-serif text-4xl text-white mb-12">Project Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {project.gallery.map((image, index) => (
                <div key={index} className="aspect-[4/3] rounded-2xl overflow-hidden">
                  <img
                    src={image}
                    alt={`${project.title} gallery ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Next Project */}
      <section className="py-32 border-t border-white/10">
        <div className="w-full px-6 lg:px-12">
          <span className="text-white/40 text-sm uppercase tracking-wider mb-8 block">
            Next Project
          </span>
          <Link
            to={`/work/${project.nextProject.id}`}
            className="group block relative aspect-[21/9] rounded-3xl overflow-hidden"
          >
            <img
              src={project.nextProject.image}
              alt={project.nextProject.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-10 md:p-16">
              <h2 className="font-serif text-5xl md:text-6xl text-white flex items-center gap-4">
                {project.nextProject.title}
                <ArrowUpRight className="w-10 h-10 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
              </h2>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
