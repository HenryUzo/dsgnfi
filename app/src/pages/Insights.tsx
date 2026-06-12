import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Plus, Minus, ArrowUpRight } from 'lucide-react';

import { SiteScopedLink } from '../components/SiteScopedLink';

const filters = ['All', 'News', 'Stories', 'Strategy', 'Thinking'];

const articles = [
  {
    id: 'how-to-brand-like-a-disruptor',
    title: 'How to Brand Like a Disruptor',
    category: 'Thinking',
    image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop',
    excerpt: 'Learn the strategies that separate disruptive brands from the competition.',
  },
  {
    id: 'unlock-the-power-of-disruptive-branding',
    title: 'Unlock the Power of Disruptive Branding',
    category: 'Thinking',
    image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop',
    excerpt: 'Discover how bold branding can transform your business.',
  },
  {
    id: 'method-branding',
    title: 'Method Branding: Our approach to building captivating brand experiences',
    category: 'Strategy',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
    excerpt: 'An inside look at our proprietary branding methodology.',
  },
  {
    id: 'our-name-story',
    title: 'The Story Behind Our Name',
    category: 'Stories',
    image: 'https://images.unsplash.com/photo-1555992336-fb0d29498b13?w=800&h=600&fit=crop',
    excerpt: 'The ancient Greek inspiration behind Attic Salt.',
  },
];

export function Insights() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const filteredArticles = activeFilter === 'All'
    ? articles
    : articles.filter(a => a.category === activeFilter);

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
        }
      );
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const items = gridRef.current?.querySelectorAll('.article-card');
    if (items) {
      gsap.fromTo(
        items,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.05,
          ease: 'power3.out',
        }
      );
    }
  }, [activeFilter]);

  return (
    <div className="min-h-screen bg-white pt-32 pb-20">
      <div className="w-full px-6 lg:px-12">
        {/* Header */}
        <div ref={headerRef} className="mb-12">
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-black mb-8">
            Branding Insights
          </h1>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between border-b border-black/10 pb-4 mb-12">
          <span className="text-black/60">{activeFilter}</span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-black/60 hover:text-black transition-colors duration-300"
          >
            {showFilters ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            Filters
          </button>
        </div>

        {/* Filter Options */}
        <div
          className={`overflow-hidden transition-all duration-500 ${
            showFilters ? 'max-h-20 opacity-100 mb-8' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="flex flex-wrap gap-4">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-300 ${
                  activeFilter === filter
                    ? 'bg-black text-white'
                    : 'bg-black/10 text-black/60 hover:bg-black/20 hover:text-black'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredArticles.map((article) => (
            <SiteScopedLink
              key={article.id}
              to={`/insights/${article.id}`}
              className="article-card group"
            >
              <div className="aspect-[16/10] rounded-2xl overflow-hidden mb-6">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <span className="text-black/40 text-sm mb-2 block">{article.category}</span>
              <h3 className="font-serif text-2xl md:text-3xl text-black group-hover:text-[var(--brand)] transition-colors duration-300 flex items-center gap-2">
                {article.title}
                <ArrowUpRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </h3>
            </SiteScopedLink>
          ))}
        </div>
      </div>
    </div>
  );
}

