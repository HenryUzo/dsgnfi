import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { SiteScopedLink } from '../components/SiteScopedLink';

gsap.registerPlugin(ScrollTrigger);

const articlesData: Record<string, {
  title: string;
  category: string;
  author: string;
  image: string;
  content: string[];
}> = {
  'how-to-brand-like-a-disruptor': {
    title: 'How to Brand Like a Disruptor',
    category: 'Thinking',
    author: 'Lauren Carr-Gasso',
    image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1600&h=900&fit=crop',
    content: [
      "After years of experience as the 'disruptive branding agency,' we've learned a few things about what it means to stand out. It's not always a matter of being the loudest or flashiest (in fact, it generally isn't). It's about focus.",
      "Focus is how you avoid scaring away customers by over-explaining your offering. It helps every member of your team understand exactly what they're working toward. And it gives you the clarity you need to make decisions that align with your brand's core purpose.",
      "Here are three simple strategic steps that'll help your brand cut through the noise:",
      "**1. Define your unique value proposition.** What makes you different? Why should customers choose you over the competition? This isn't about being betterâ€”it's about being different in a way that matters to your audience.",
      "**2. Simplify your message.** The most memorable brands say one thing and say it well. Don't try to be everything to everyone. Find your core message and repeat it consistently across every touchpoint.",
      "**3. Be bold in your execution.** Once you know who you are and what you stand for, don't be afraid to express it boldly. Disruptive brands aren't timidâ€”they make statements and stand by them.",
      "Remember: disruption isn't about destruction. It's about creating something so compelling that it changes the way people think about your category. That's the power of focused, strategic branding."
    ],
  },
  'unlock-the-power-of-disruptive-branding': {
    title: 'Unlock the Power of Disruptive Branding',
    category: 'Thinking',
    author: 'Rani Sweis',
    image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600&h=900&fit=crop',
    content: [
      "In a world where consumers are bombarded with thousands of brand messages every day, standing out isn't just an advantageâ€”it's a necessity. Disruptive branding is the art of breaking through the noise by challenging conventions and offering something genuinely different.",
      "But what exactly makes a brand 'disruptive'? It's not about being loud or controversial for the sake of it. True disruption comes from a deep understanding of your audience and a willingness to challenge the status quo in ways that create real value.",
      "Consider some of the most successful disruptive brands: Apple challenged the idea that technology had to be complicated. Dollar Shave Club questioned why razors needed to be so expensive. These brands didn't just competeâ€”they redefined their categories.",
      "The key to disruptive branding lies in three core principles:",
      "**Challenge assumptions.** Every industry has unwritten rules that everyone follows without question. Disruptive brands identify these assumptions and ask: 'What if we did things differently?'",
      "**Focus on the customer experience.** Disruption isn't about your productâ€”it's about how people experience your brand. The best disruptive brands make life easier, more enjoyable, or more meaningful for their customers.",
      "**Be authentic.** Disruption without authenticity is just noise. Your brand needs to stand for something real, something that resonates with your audience on an emotional level.",
      "Ready to disrupt your category? Start by asking the hard questions about why things are the way they are. The answers might just lead you to your next big breakthrough."
    ],
  },
  'method-branding': {
    title: 'Method Branding: Our approach to building captivating brand experiences',
    category: 'Strategy',
    author: 'Attic Salt Team',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&h=900&fit=crop',
    content: [
      "At Attic Salt, we believe that great branding isn't just about creating pretty logos or catchy taglines. It's about building a complete identity that resonates with your audience on a deep, emotional level. That's why we developed Method Brandingâ„¢â€”our proprietary approach to creating brands that captivate and convert.",
      "Inspired by method acting, our process ensures we embody the brand before we express it. Just as a method actor becomes their character, we immerse ourselves in your brand's worldâ€”understanding your audience, your competition, and your unique place in the market.",
      "Our iACT process is built on four key stages:",
      "**Immerse.** We start by diving deep into your organization, your industry, and your audience. Through workshops, research, and analysis, we uncover the insights that will drive your brand strategy.",
      "**Articulate.** With a clear understanding of your brand's essence, we define your positioning, messaging, and voice. This is where your brand's personality begins to take shape.",
      "**Create.** We translate your strategy into visual and verbal expressionsâ€”logos, color palettes, typography, imagery, and language that bring your brand to life.",
      "**Transform.** Finally, we help you roll out your new brand across every touchpoint, ensuring consistency and impact at every interaction.",
      "The result? A brand identity that feels real, not rehearsed. One that connects with your audience authentically and drives meaningful business results."
    ],
  },
  'our-name-story': {
    title: 'The Story Behind Our Name',
    category: 'Stories',
    author: 'Attic Salt Team',
    image: 'https://images.unsplash.com/photo-1555992336-fb0d29498b13?w=1600&h=900&fit=crop',
    content: [
      "Attic Salt. It's a name that often raises eyebrows and sparks curiosity. 'What does it mean?' people ask. 'Why did you choose it?' The answer lies in ancient Greece, in a region called Attica.",
      "Attica encompassed the city of Athens and was home to some of the most celebrated thinkers, writers, and orators in history. The people of Attica were known for their refined wit, their clever wordplay, and their ability to charm audiences with sparkling conversation.",
      "This particular qualityâ€”delicate, refined, brilliant witâ€”came to be known as 'Attic Salt.' It was a term of praise, reserved for those who could express complex ideas with grace and humor.",
      "When we were naming our agency, we wanted something that captured our approach to branding. We believe that the best brands, like the best conversations, should sparkle. They should be clever without being pretentious, refined without being stuffy, memorable without being loud.",
      "Attic Salt embodies everything we strive for: sparkling thought, well expressed. It's a reminder that branding isn't just about being seenâ€”it's about being remembered for the right reasons.",
      "So the next time someone asks about our name, we get to share this story. And in doing so, we get to demonstrate exactly what we mean by sparkling thought, well expressed."
    ],
  },
};

export function InsightArticle() {
  const { id } = useParams<{ id: string }>();
  const contentRef = useRef<HTMLDivElement>(null);

  const article = id ? articlesData[id] : null;

  useEffect(() => {
    if (!article) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.article-content',
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
        }
      );
    });

    return () => ctx.revert();
  }, [article]);

  if (!article) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-20">
        <div className="w-full px-6 lg:px-12">
          <h1 className="font-serif text-5xl text-black">Article not found</h1>
          <SiteScopedLink to="/insights" className="text-black/60 hover:text-black mt-4 inline-block">
            â† Back to Insights
          </SiteScopedLink>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-20">
      <div className="w-full px-6 lg:px-12">
        {/* Back Link */}
        <SiteScopedLink
          to="/insights"
          className="inline-flex items-center gap-2 text-black/60 hover:text-black transition-colors duration-300 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Insights
        </SiteScopedLink>

        {/* Header */}
        <div className="max-w-4xl mb-12">
          <span className="text-black/40 text-sm uppercase tracking-wider mb-4 block">
            {article.category}
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-black mb-6">
            {article.title}
          </h1>
          <p className="text-black/60">by {article.author}</p>
        </div>

        {/* Hero Image */}
        <div className="aspect-[16/9] rounded-2xl overflow-hidden mb-16">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div ref={contentRef} className="article-content max-w-3xl mx-auto">
          <div className="prose prose-lg max-w-none">
            {article.content.map((paragraph, index) => (
              <p
                key={index}
                className={`text-black/80 text-lg leading-relaxed mb-6 ${
                  paragraph.startsWith('**') ? 'font-semibold text-black' : ''
                }`}
                dangerouslySetInnerHTML={{
                  __html: paragraph
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                }}
              />
            ))}
          </div>
        </div>

        {/* Related Articles */}
        <div className="mt-24 pt-12 border-t border-black/10">
          <h2 className="font-serif text-3xl text-black mb-8">More Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(articlesData)
              .filter(([key]) => key !== id)
              .slice(0, 3)
              .map(([key, relatedArticle]) => (
                <SiteScopedLink
                  key={key}
                  to={`/insights/${key}`}
                  className="group"
                >
                  <div className="aspect-[16/10] rounded-xl overflow-hidden mb-4">
                    <img
                      src={relatedArticle.image}
                      alt={relatedArticle.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <span className="text-black/40 text-sm">{relatedArticle.category}</span>
                  <h3 className="font-serif text-xl text-black group-hover:text-[var(--brand)] transition-colors">
                    {relatedArticle.title}
                  </h3>
                </SiteScopedLink>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
