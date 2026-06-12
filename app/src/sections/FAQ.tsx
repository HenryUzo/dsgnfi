import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Plus, Minus } from 'lucide-react';
import { useCmsSection } from '../hooks/useCmsSection';

gsap.registerPlugin(ScrollTrigger);

const fallbackFaq = {
  visible: true,
  items: [
    {
      question: 'What is disruptive branding?',
      answer:
        'Disruptive branding is the art and science of crafting identities so differentiated that they cut through the noise of saturated categories and industries.',
    },
    {
      question: "What's the difference between branding and marketing?",
      answer:
        'Your brand is the perception people have of your business. Branding is the strategy, words, visuals, and actions you take to consciously and subconsciously shape that perception. Marketing is the mass distribution of your branding to increase awareness of your business. In short: Marketing brings the horses to water. Branding influences the right ones to drink.',
    },
    {
      question: 'How do you measure the ROI of branding?',
      answer:
        'While branding is long-term, ROI can be measured through increases in brand awareness, customer and staff loyalty, conversion rates, pricing power, and marketing effectiveness. Clear positioning and identity also enhances the customer experience leading to shorter sales cycles and increased lifetime customer value.',
    },
    {
      question: 'Do you specifically serve B2B or B2C?',
      answer:
        'Neither and both. Human 2 Human actually. We believe that sole purpose of branding is to enhance the connection between companies and the people who matter most to them. Unless your audience is not human, we can help.',
    },
    {
      question: 'Do you offer personal branding?',
      answer: "No. Personally, it's just not our thing.",
    },
  ],
};

type FaqData = typeof fallbackFaq;

export function FAQ() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { data } = useCmsSection<FaqData>('home', 'faq', fallbackFaq);
  const faqData = data ?? fallbackFaq;

  if (faqData.visible === false) {
    return null;
  }

  useEffect(() => {
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
  }, []);

  const items = faqData.items?.length ? faqData.items : fallbackFaq.items;

  return (
    <section ref={sectionRef} className="bg-black py-32">
      <div className="w-full px-6 lg:px-12">
        {/* Header */}
        <div ref={headerRef} className="mb-16">
          <span className="text-xs font-medium uppercase tracking-wider text-white/40 mb-4 block">
            Frequently Asked
          </span>
          <h2 className="font-serif text-5xl md:text-6xl text-white">
            Frequently Answered
          </h2>
        </div>

        {/* FAQ Items */}
        <div className="space-y-0">
          {items.map((faq, index) => (
            <div
              key={`${faq.question}-${index}`}
              className="border-b border-white/10"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full py-6 flex items-center justify-between group text-left"
              >
                <span className="text-xl md:text-2xl text-white pr-8">
                  {faq.question}
                </span>
                <span className="flex-shrink-0 text-white/40 group-hover:text-white transition-colors duration-300">
                  {openIndex === index ? (
                    <Minus className="w-6 h-6" />
                  ) : (
                    <Plus className="w-6 h-6" />
                  )}
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-500 ${
                  openIndex === index ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-white/60 text-lg leading-relaxed max-w-3xl">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
