import { useEffect, useRef, useState } from "react";

type BlockRevealProps = {
  children: React.ReactNode;
  enabled?: boolean;
  delay?: number;
};

export function BlockReveal({ children, enabled = true, delay = 0 }: BlockRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        });
      },
      { rootMargin: "-10% 0px", threshold: 0.1 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [enabled]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
