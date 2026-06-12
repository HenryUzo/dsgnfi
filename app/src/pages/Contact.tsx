import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowDownRight, X, Send } from 'lucide-react';

export function Contact() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    company: '',
    budget: '',
    message: '',
    website: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          website: formData.website,
          company: formData.company,
          budget: formData.budget,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to send message');
      }

      setIsSubmitted(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setIsSubmitted(false);
        setFormData({
          name: '',
          email: '',
          subject: '',
          company: '',
          budget: '',
          message: '',
          website: '',
        });
      }, 2000);
    } catch (error) {
console.error(error);
      setErrorMessage("Could not send message. Please try again or email support@dsgnfi.com.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-black pt-32 pb-20">
      <div className="w-full px-6 lg:px-12">
        <div ref={contentRef}>
          {/* Header */}
          <div className="mb-16">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-white mb-8">
              Get in touch
            </h1>
            <p className="text-white/60 max-w-2xl text-lg leading-relaxed">
              From seed-stage startups to multinational corporations, we're well-versed in 
              helping challenger brands of all sizes overcome their toughest challenges and 
              unlock new opportunities with clever strategy, storytelling, and design.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* New Business Card */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="group relative rounded-3xl border border-white/10 p-10 md:p-12 overflow-hidden transition-all duration-500 hover:border-white/30 hover:bg-white/5 text-left"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-serif text-4xl md:text-5xl text-white">
                    New Business
                  </h2>
                  <span className="px-3 py-1 bg-white/10 rounded-full text-white/60 text-sm">
                    18 spots remaining
                  </span>
                </div>
                <div className="flex items-center justify-between mt-12">
                  <span className="text-white/60 uppercase tracking-wider text-sm">
                    Start a Project
                  </span>
                  <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-300">
                    <ArrowDownRight className="w-5 h-5 text-white group-hover:text-black transition-colors duration-300" />
                  </div>
                </div>
              </div>
            </button>

            {/* General Inquiries Card */}
            <a
              href="mailto:hello@atticsalt.co"
              className="group relative rounded-3xl border border-white/10 p-10 md:p-12 overflow-hidden transition-all duration-500 hover:border-white/30 hover:bg-white/5"
            >
              <div className="relative z-10">
                <h2 className="font-serif text-4xl md:text-5xl text-white mb-4">
                  General Inquiries
                </h2>
                <div className="flex items-center justify-between mt-12">
                  <span className="text-white/60 uppercase tracking-wider text-sm">
                    Say Hello
                  </span>
                  <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-300">
                    <ArrowDownRight className="w-5 h-5 text-white group-hover:text-black transition-colors duration-300" />
                  </div>
                </div>
              </div>
            </a>
          </div>

          {/* Project Types */}
          <div className="mt-24">
            <h3 className="text-white/40 text-sm uppercase tracking-wider mb-8">
              We'll consider any project backed by passion, but bonus points if they involve:
            </h3>
            <div className="flex flex-wrap gap-4">
              {['Brand Strategy', 'Visual Identity', 'Naming', 'Web Design', 'Motion Design', 'Brand Guidelines'].map((type) => (
                <span
                  key={type}
                  className="px-6 py-3 rounded-full border border-white/10 text-white/60 hover:border-white/30 hover:text-white transition-all duration-300"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h4 className="text-white/40 text-sm uppercase tracking-wider mb-4">Location</h4>
              <p className="text-white">
                6125 E Indian School Rd # 2000<br />
                Scottsdale, AZ 85251
              </p>
            </div>
            <div>
              <h4 className="text-white/40 text-sm uppercase tracking-wider mb-4">Email</h4>
              <a
                href="mailto:hello@atticsalt.co"
                className="text-white hover:text-[var(--brand)] transition-colors duration-300"
              >
                hello@atticsalt.co
              </a>
            </div>
            <div>
              <h4 className="text-white/40 text-sm uppercase tracking-wider mb-4">Phone</h4>
              <a
                href="tel:+14805551234"
                className="text-white hover:text-[var(--brand)] transition-colors duration-300"
              >
                +1 (480) 555-1234
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false);
              setErrorMessage(null);
            }}
          />
          <div className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-black/10 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-3xl text-black">Start a Project</h2>
                <p className="text-black/60 text-sm mt-1">Tell us about your project and we'll be in touch.</p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setErrorMessage(null);
                }}
                className="w-10 h-10 rounded-full border border-black/20 flex items-center justify-center hover:bg-black hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <Send className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-serif text-2xl text-black mb-2">Message Sent!</h3>
                  <p className="text-black/60">We'll be in touch within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="hidden">
                    <label className="block text-black text-sm font-medium mb-2" htmlFor="website">
                      Website
                    </label>
                    <input
                      id="website"
                      type="text"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      autoComplete="off"
                      tabIndex={-1}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-black text-sm font-medium mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-black/20 rounded-xl focus:outline-none focus:border-[var(--brand)] transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-black text-sm font-medium mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-black/20 rounded-xl focus:outline-none focus:border-[var(--brand)] transition-colors"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-black text-sm font-medium mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-black/20 rounded-xl focus:outline-none focus:border-[var(--brand)] transition-colors"
                        placeholder="Project inquiry"
                      />
                    </div>
                    <div>
                      <label className="block text-black text-sm font-medium mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-black/20 rounded-xl focus:outline-none focus:border-[var(--brand)] transition-colors"
                        placeholder="Your company"
                      />
                    </div>
                    <div>
                      <label className="block text-black text-sm font-medium mb-2">
                        Budget Range
                      </label>
                      <select
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-black/20 rounded-xl focus:outline-none focus:border-[var(--brand)] transition-colors bg-white"
                      >
                        <option value="">Select a range</option>
                        <option value="25k-50k">$25k - $50k</option>
                        <option value="50k-100k">$50k - $100k</option>
                        <option value="100k-250k">$100k - $250k</option>
                        <option value="250k+">$250k+</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-black text-sm font-medium mb-2">
                      Tell us about your project *
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-black/20 rounded-xl focus:outline-none focus:border-[var(--brand)] transition-colors resize-none"
                      placeholder="What are you looking to achieve? What's your timeline?"
                    />
                  </div>

                  {errorMessage && (
                    <p className="text-sm text-red-600">{errorMessage}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-black text-white rounded-xl font-medium hover:bg-[var(--brand)] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:bg-black"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

