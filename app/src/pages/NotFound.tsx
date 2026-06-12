import { SiteScopedLink } from '../components/SiteScopedLink';

export function NotFound() {
  return (
    <div className="min-h-screen bg-black pt-32 pb-20">
      <div className="w-full px-6 lg:px-12">
        <div className="max-w-3xl">
          <span className="text-white/40 text-sm uppercase tracking-wider">404</span>
          <h1 className="font-serif text-5xl md:text-6xl text-white mt-4 mb-6">
            Page not found
          </h1>
          <p className="text-white/60 text-lg leading-relaxed mb-10">
            The page you are looking for does not exist. Try one of the destinations below.
          </p>
          <div className="flex flex-wrap gap-4">
            <SiteScopedLink
              to="/"
              className="inline-flex items-center px-6 py-3 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white transition-colors duration-300"
            >
              Back to Home
            </SiteScopedLink>
            <SiteScopedLink
              to="/work"
              className="inline-flex items-center px-6 py-3 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white transition-colors duration-300"
            >
              View Work
            </SiteScopedLink>
          </div>
        </div>
      </div>
    </div>
  );
}
