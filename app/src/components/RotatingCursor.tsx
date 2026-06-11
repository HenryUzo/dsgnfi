import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface RotatingCursorProps {
  text?: string;
  size?: number;
}

export function RotatingCursor({ text = 'PLAY SHOWREEL • PLAY SHOWREEL • ', size = 120 }: RotatingCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<SVGSVGElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // Check if touch device
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (isTouchDevice) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Check if hovering over hero section
      const heroSection = document.querySelector('[data-cursor-trigger]');
      if (heroSection) {
        const rect = heroSection.getBoundingClientRect();
        const isInHero = e.clientY >= rect.top && e.clientY <= rect.bottom;
        setIsHovering(isInHero);
      }

      gsap.to(cursor, {
        x: e.clientX - size / 2,
        y: e.clientY - size / 2,
        duration: 0.08,
        ease: 'power2.out',
      });

      if (!isVisible) setIsVisible(true);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Rotate text continuously
    if (textRef.current) {
      gsap.to(textRef.current, {
        rotation: 360,
        duration: 10,
        repeat: -1,
        ease: 'none',
      });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [size, isVisible]);

  // Don't render on touch devices
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className={`custom-cursor pointer-events-none fixed z-[9999] transition-opacity duration-300 ${
        isVisible && isHovering ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ width: size, height: size }}
    >
      <svg
        ref={textRef}
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ transformOrigin: 'center' }}
      >
        <defs>
          <path
            id="circlePath"
            d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
          />
        </defs>
        <text className="fill-white text-[8px] font-medium tracking-[0.2em] uppercase">
          <textPath href="#circlePath">
            {text}
          </textPath>
        </text>
        {/* Center play icon */}
        <polygon
          points="45,40 45,60 60,50"
          className="fill-white"
        />
      </svg>
    </div>
  );
}

// Simple cursor follower for non-hero areas
export function CursorFollower() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorDot = cursorDotRef.current;
    if (!cursor || !cursorDot) return;

    // Check if touch device
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (isTouchDevice) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Check if hovering over hero section
      const heroSection = document.querySelector('[data-cursor-trigger]');
      const isInHero = heroSection ? 
        e.clientY >= heroSection.getBoundingClientRect().top && 
        e.clientY <= heroSection.getBoundingClientRect().bottom : false;

      // Only show cursor outside hero
      if (!isInHero) {
        gsap.to(cursor, {
          x: e.clientX - 20,
          y: e.clientY - 20,
          duration: 0.15,
          ease: 'power2.out',
        });
        gsap.to(cursorDot, {
          x: e.clientX - 4,
          y: e.clientY - 4,
          duration: 0.05,
          ease: 'none',
        });
        if (!isVisible) setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    // Handle hover on interactive elements
    const handleElementHover = () => {
      gsap.to(cursor, {
        scale: 1.5,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    const handleElementLeave = () => {
      gsap.to(cursor, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Add hover effects to interactive elements
    const interactiveElements = document.querySelectorAll('a, button, [role="button"]');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', handleElementHover);
      el.addEventListener('mouseleave', handleElementLeave);
    });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleElementHover);
        el.removeEventListener('mouseleave', handleElementLeave);
      });
    };
  }, [isVisible]);

  // Don't render on touch devices
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }

  return (
    <>
      <div
        ref={cursorRef}
        className={`custom-cursor fixed z-[9998] pointer-events-none transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ width: 40, height: 40 }}
      >
        <div className="w-full h-full rounded-full border border-white/50" />
      </div>
      <div
        ref={cursorDotRef}
        className={`custom-cursor fixed z-[9999] pointer-events-none transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ width: 8, height: 8 }}
      >
        <div className="w-full h-full rounded-full bg-white" />
      </div>
    </>
  );
}
