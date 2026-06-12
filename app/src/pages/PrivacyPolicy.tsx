import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function PrivacyPolicy() {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-white pt-32 pb-20">
      <div className="w-full px-6 lg:px-12">
        <div ref={contentRef} className="max-w-4xl">
          <h1 className="font-serif text-5xl md:text-6xl text-black mb-6">Privacy Policy</h1>
          <p className="text-black/60 text-lg leading-relaxed mb-12">
            This page explains how Attic Salt collects, uses, and protects your information.
          </p>

          <div className="space-y-10">
            <section>
              <h2 className="font-serif text-3xl text-black mb-3">Information We Collect</h2>
              <p className="text-black/70 leading-relaxed">
                We may collect contact information, project inquiry details, and analytics data
                needed to improve our website and services.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl text-black mb-3">How We Use Information</h2>
              <p className="text-black/70 leading-relaxed">
                We use data to respond to inquiries, provide services, and communicate relevant
                updates. We do not sell your personal information.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl text-black mb-3">Data Security</h2>
              <p className="text-black/70 leading-relaxed">
                We apply reasonable technical and organizational safeguards to protect submitted
                information against unauthorized access and misuse.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl text-black mb-3">Contact</h2>
              <p className="text-black/70 leading-relaxed">
                Questions about this policy can be sent to hello@atticsalt.co.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
