import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useCmsSection } from '../hooks/useCmsSection';
import { X } from 'lucide-react';

const fallbackHero = {
  headline: 'Unstoppable identities and experiences for brands on the move.',
  subheadline: 'Branding for your next chapter.',
  backgroundImageUrl: '',
  backgroundVideoUrl: '',
  visible: true,
};

type HeroData = typeof fallbackHero;

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const figuresRef = useRef<HTMLDivElement>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const { data } = useCmsSection<HeroData>('home', 'hero', fallbackHero);
  const heroData = data ?? fallbackHero;
  const backgroundImageUrl = heroData.backgroundImageUrl ?? '';
  const backgroundVideoUrl = heroData.backgroundVideoUrl ?? '';
  const hasVideo = Boolean(backgroundVideoUrl);

  if (heroData.visible === false) {
    return null;
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.3 }
      );

      // Subtitle animation
      gsap.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.6 }
      );

      // Figures parallax animation
      const figures = figuresRef.current?.querySelectorAll('.geometric-figure');
      figures?.forEach((figure, index) => {
        gsap.fromTo(
          figure,
          { opacity: 0, scale: 0.8 },
          {
            opacity: 0.15,
            scale: 1,
            duration: 1.5,
            ease: 'power3.out',
            delay: 0.8 + index * 0.1,
          }
        );

        // Continuous floating animation
        gsap.to(figure, {
          y: '+=20',
          duration: 3 + index * 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVideoModalOpen(false);
      }
    };

    if (isVideoModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isVideoModalOpen]);

  return (
    <>
      <section
        ref={heroRef}
        data-cursor-trigger
        onClick={hasVideo ? () => setIsVideoModalOpen(true) : undefined}
        className={`relative min-h-screen flex items-center justify-center bg-black overflow-hidden bg-cover bg-center ${
          hasVideo ? 'cursor-pointer' : ''
        }`}
        style={
          backgroundImageUrl
            ? { backgroundImage: `url(${backgroundImageUrl})` }
            : undefined
        }
      >
        {backgroundVideoUrl ? (
          <video
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            src={backgroundVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            poster={backgroundImageUrl || undefined}
          />
        ) : null}
        <div className="absolute inset-0 bg-black/60" />
        {/* Geometric Figures Background */}
        <div ref={figuresRef} className="absolute inset-0 pointer-events-none">
        {/* Figure 1 - Standing person */}
        <svg
          className="geometric-figure absolute top-[15%] left-[10%] w-32 h-48"
          viewBox="0 0 100 150"
          fill="currentColor"
        >
          <circle cx="50" cy="20" r="15" />
          <rect x="35" y="40" width="30" height="50" rx="5" />
          <rect x="25" y="45" width="15" height="40" rx="3" />
          <rect x="60" y="45" width="15" height="40" rx="3" />
          <rect x="35" y="95" width="12" height="50" rx="3" />
          <rect x="53" y="95" width="12" height="50" rx="3" />
        </svg>

        {/* Figure 2 - Person with dress */}
        <svg
          className="geometric-figure absolute top-[20%] right-[15%] w-28 h-44"
          viewBox="0 0 100 150"
          fill="currentColor"
        >
          <circle cx="50" cy="20" r="15" />
          <path d="M35 40 L65 40 L75 90 L25 90 Z" />
          <rect x="25" y="45" width="15" height="35" rx="3" />
          <rect x="60" y="45" width="15" height="35" rx="3" />
          <rect x="38" y="95" width="10" height="50" rx="3" />
          <rect x="52" y="95" width="10" height="50" rx="3" />
        </svg>

        {/* Figure 3 - Seated person */}
        <svg
          className="geometric-figure absolute bottom-[25%] left-[20%] w-36 h-40"
          viewBox="0 0 120 100"
          fill="currentColor"
        >
          <circle cx="60" cy="20" r="15" />
          <rect x="45" y="40" width="30" height="35" rx="5" />
          <rect x="35" y="45" width="15" height="30" rx="3" />
          <rect x="70" y="45" width="15" height="30" rx="3" />
          <rect x="35" y="75" width="40" height="12" rx="3" />
          <rect x="35" y="90" width="12" height="25" rx="3" />
        </svg>

        {/* Figure 4 - Person at desk */}
        <svg
          className="geometric-figure absolute bottom-[20%] right-[10%] w-40 h-36"
          viewBox="0 0 140 100"
          fill="currentColor"
        >
          <circle cx="70" cy="20" r="15" />
          <rect x="55" y="40" width="30" height="35" rx="5" />
          <rect x="45" y="45" width="15" height="30" rx="3" />
          <rect x="80" y="45" width="15" height="30" rx="3" />
          <rect x="20" y="75" width="100" height="15" rx="3" />
          <rect x="30" y="90" width="12" height="20" rx="3" />
          <rect x="98" y="90" width="12" height="20" rx="3" />
        </svg>

        {/* Figure 5 - Abstract shape */}
        <svg
          className="geometric-figure absolute top-[50%] left-[5%] w-24 h-24"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <polygon points="50,5 95,50 50,95 5,50" />
        </svg>

        {/* Figure 6 - Quote marks */}
        <svg
          className="geometric-figure absolute top-[60%] right-[25%] w-20 h-16"
          viewBox="0 0 100 80"
          fill="currentColor"
        >
          <path d="M20 40 Q20 20 40 20 L50 20 L50 40 L40 40 Q40 60 20 60 Z" />
          <path d="M60 40 Q60 20 80 20 L90 20 L90 40 L80 40 Q80 60 60 60 Z" />
        </svg>

        {/* Figure 7 - Bar chart */}
        <svg
          className="geometric-figure absolute bottom-[15%] left-[45%] w-28 h-32"
          viewBox="0 0 100 120"
          fill="currentColor"
        >
          <rect x="10" y="60" width="20" height="50" rx="2" />
          <rect x="40" y="30" width="20" height="80" rx="2" />
          <rect x="70" y="10" width="20" height="100" rx="2" />
        </svg>

        {/* Figure 8 - Circular element */}
        <svg
          className="geometric-figure absolute top-[10%] right-[35%] w-16 h-16"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" />
          <circle cx="50" cy="50" r="20" />
        </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full px-6 lg:px-12 pt-32 pb-20">
          <div className="max-w-5xl">
            <h1
              ref={titleRef}
              className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white leading-[1.1] mb-8"
            >
              {heroData.headline ?? fallbackHero.headline}
            </h1>
            <p
              ref={subtitleRef}
              className="text-xl md:text-2xl text-white/60 max-w-2xl"
            >
              {heroData.subheadline ?? fallbackHero.subheadline}
            </p>
            {hasVideo ? (
              <p className="mt-8 text-xs uppercase tracking-[0.3em] text-white/50">
                Click banner to play video
              </p>
            ) : null}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs text-white/40 uppercase tracking-widest">Scroll</span>
          <div className="w-[1px] h-12 bg-white/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-4 bg-white animate-bounce" />
          </div>
        </div>
      </section>

      {isVideoModalOpen && hasVideo ? (
        <div
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl rounded-2xl border border-white/15 bg-black p-3 md:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white/80 hover:text-white"
              aria-label="Close video"
            >
              <X className="h-5 w-5" />
            </button>
            <video
              src={backgroundVideoUrl}
              controls
              autoPlay
              playsInline
              poster={backgroundImageUrl || undefined}
              className="w-full max-h-[85vh] rounded-xl"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
