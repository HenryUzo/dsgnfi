import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Toaster } from 'sonner';

import { AdminProvider } from './auth/useAdmin';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { RotatingCursor, CursorFollower } from './components/RotatingCursor';
import { AdminShell } from './components/admin/AdminShell';
import { PublicSiteProvider, usePublicSite } from './site/PublicSiteContext';
import type { ThemeSettings } from './services/siteSettings';

import { Hero } from './sections/Hero';
import { Services } from './sections/Services';
import { FeaturedWork } from './sections/FeaturedWork';
import { Awards } from './sections/Awards';
import { Testimonials } from './sections/Testimonials';
import { FAQ } from './sections/FAQ';
import { CTA } from './sections/CTA';

import { Work } from './pages/Work';
import { Project } from './pages/Project';
import { Process } from './pages/Process';
import { Studio } from './pages/Studio';
import { Insights } from './pages/Insights';
import { InsightArticle } from './pages/InsightArticle';
import { Contact } from './pages/Contact';
import { Careers } from './pages/Careers';
import { PreviewPage } from './pages/PreviewPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { PublicPage, PublicPageContent } from './pages/PublicPage';

import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminHomeEditor } from './pages/admin/AdminHomeEditor';
import { AdminSites } from './pages/admin/AdminSites';
import { PagesAdmin } from './pages/admin/PagesAdmin';
import { PageEditor } from './pages/admin/PageEditor';
import { TemplatesAdmin } from './pages/admin/TemplatesAdmin';
import { TemplatePreviewPage } from './pages/admin/TemplatePreviewPage';
import { WorkAdmin } from './pages/admin/WorkAdmin';
import { ProcessAdmin } from './pages/admin/ProcessAdmin';
import { SiteSettingsAdmin } from './pages/admin/SiteSettingsAdmin';
import { RequireAdmin } from './auth/RequireAdmin';
import { getPublicPageBySlug, type PublicPageDetail } from './services/siteSettings';

gsap.registerPlugin(ScrollTrigger);

const defaultTheme = {
  brandColor: '#1a4ce0',
};

const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(hex?: string) {
  if (!hex || !hexRegex.test(hex)) return null;
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }
  return hex.toLowerCase();
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return [r, g, b];
}

function darkenHex(hex: string, amount = 0.18) {
  const [r, g, b] = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const toHex = (v: number) => clamp(Math.round(v)).toString(16).padStart(2, '0');
  return `#${toHex(r * (1 - amount))}${toHex(g * (1 - amount))}${toHex(b * (1 - amount))}`;
}

function applyTheme(brandColor?: string) {
  const normalized = normalizeHex(brandColor) ?? defaultTheme.brandColor;
  const root = document.documentElement;
  root.style.setProperty('--brand', normalized);
  root.style.setProperty('--brand-dark', darkenHex(normalized));
  const [r, g, b] = hexToRgb(normalized);
  root.style.setProperty('--brand-rgb', `${r} ${g} ${b}`);
}

// Scroll to top on route change
function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

// Home page component
function Home() {
  return (
    <>
      <Hero />
      <Services />
      <FeaturedWork />
      <Awards />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
}

function PublicPageRoute({
  slug,
  fallback,
}: {
  slug: string;
  fallback: React.ReactNode;
}) {
  const location = useLocation();
  const [page, setPage] = useState<PublicPageDetail | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoaded(false);
      try {
        const nextPage = await getPublicPageBySlug(slug);
        if (!cancelled) {
          setPage(nextPage);
        }
      } catch {
        if (!cancelled) {
          setPage(null);
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [location.search, slug]);

  if (!loaded) {
    return <div className="min-h-screen bg-black px-6 py-24 text-sm text-white/60">Loading page...</div>;
  }

  return page ? <PublicPageContent page={page} /> : <>{fallback}</>;
}

function CurrentPathPublicPageRoute({
  fallback,
}: {
  fallback: React.ReactNode;
}) {
  const location = useLocation();
  return <PublicPageRoute slug={location.pathname} fallback={fallback} />;
}

// Public site layout
function PublicLayoutInner() {
  const location = useLocation();
  const { presentation, loading, error } = usePublicSite();
  const isLightPage =
    location.pathname === '/insights' ||
    location.pathname.startsWith('/insights/') ||
    location.pathname === '/careers' ||
    location.pathname === '/privacy-policy';

  useEffect(() => {
    const themeData = presentation?.theme as ThemeSettings | undefined;
    applyTheme(themeData?.primaryColor ?? defaultTheme.brandColor);
  }, [presentation?.theme]);

  useEffect(() => {
    const faviconHref = presentation?.settings.faviconUrl;
    if (!faviconHref) {
      return;
    }

    const linkEl =
      document.querySelector<HTMLLinkElement>("link[rel='icon']") ??
      (() => {
        const created = document.createElement("link");
        created.rel = "icon";
        document.head.appendChild(created);
        return created;
      })();

    linkEl.href = faviconHref;
  }, [presentation?.settings.faviconUrl]);

  useEffect(() => {
    if (presentation?.settings.seoTitle || presentation?.site.name) {
      document.title = presentation.settings.seoTitle ?? presentation.site.name;
    }
  }, [presentation?.settings.seoTitle, presentation?.site.name]);

  if (loading && !presentation) {
    return (
      <div className="min-h-screen bg-black px-6 py-24 text-sm text-white/60">
        Loading site...
      </div>
    );
  }

  if (error && !presentation) {
    return (
      <div className="min-h-screen bg-black px-6 py-24 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Site</p>
          <h1 className="mt-4 font-serif text-5xl">Site not found</h1>
          <p className="mt-4 max-w-2xl text-white/65">
            This host is not mapped to an active site yet. Check the current domain
            configuration or use a verified domain or valid development override.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isLightPage ? 'bg-white' : 'bg-black'}`}>
      <Navigation />
      <main>
        <Routes>
          <Route path="/" element={<PublicPageRoute slug="/" fallback={<Home />} />} />
          <Route path="/work" element={<Work />} />
          <Route path="/work/:slug" element={<CurrentPathPublicPageRoute fallback={<Project />} />} />
          <Route path="/process" element={<PublicPageRoute slug="/process" fallback={<Process />} />} />
          <Route path="/studio" element={<PublicPageRoute slug="/studio" fallback={<Studio />} />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/insights/:id" element={<InsightArticle />} />
          <Route path="/contact" element={<PublicPageRoute slug="/contact" fallback={<Contact />} />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="*" element={<PublicPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function PublicLayout() {
  return (
    <PublicSiteProvider>
      <PublicLayoutInner />
    </PublicSiteProvider>
  );
}

function AdminRoute({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <RequireAdmin>
      <AdminShell title={title}>{children}</AdminShell>
    </RequireAdmin>
  );
}

function LegacyHomeEditorRoute() {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-50">
        <p className="font-semibold">Legacy homepage editor</p>
        <p className="mt-1 text-amber-50/75">
          This editor is kept for older section-based homepage content. New CMS pages should be edited from the block-based Page Editor.
        </p>
      </div>
      <AdminHomeEditor />
    </div>
  );
}

export function shouldRedirectRootToAdmin(hostname: string, pathname: string) {
  const normalizedHost = hostname.trim().toLowerCase();
  return normalizedHost === 'admin.dsgnfi.com' && pathname === '/';
}

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const shouldRouteRootToAdmin =
    typeof window !== 'undefined' &&
    shouldRedirectRootToAdmin(window.location.hostname, location.pathname);

  useEffect(() => {
    document.body.classList.toggle('admin-ui', isAdminRoute);
    return () => {
      document.body.classList.remove('admin-ui');
    };
  }, [isAdminRoute]);

  return (
    <>
      {!isAdminRoute && (
        <>
          <RotatingCursor text="PLAY SHOWREEL â€¢ PLAY SHOWREEL â€¢ " size={140} />
          <CursorFollower />
        </>
      )}
      {shouldRouteRootToAdmin ? (
        <Navigate replace to="/admin" />
      ) : (
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminRoute title="Dashboard">
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/sites"
            element={
              <AdminRoute title="Sites">
                <AdminSites />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/templates"
            element={
              <AdminRoute title="Templates">
                <TemplatesAdmin />
              </AdminRoute>
            }
          />
          <Route path="/template-previews/:templateKey" element={<TemplatePreviewPage />} />
          <Route
            path="/admin/pages"
            element={
              <AdminRoute title="Pages">
                <PagesAdmin />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/pages/home"
            element={
              <AdminRoute title="Page Editor">
                <PageEditor />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/legacy/home"
            element={
              <AdminRoute title="Legacy Home Editor">
                <LegacyHomeEditorRoute />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/pages/home/legacy"
            element={<Navigate replace to="/admin/legacy/home" />}
          />
          <Route
            path="/admin/pages/generic/:pageKey"
            element={
              <AdminRoute title="Page Editor">
                <PageEditor />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/pages/:pageKey"
            element={
              <AdminRoute title="Page Editor">
                <PageEditor />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/site-settings"
            element={
              <AdminRoute title="Site Settings">
                <SiteSettingsAdmin />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/work"
            element={
              <AdminRoute title="Work Setup">
                <WorkAdmin />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/process"
            element={
              <AdminRoute title="Process Page">
                <ProcessAdmin />
              </AdminRoute>
            }
          />
          <Route path="/preview/pages/:pageKey" element={<PreviewPage />} />
          <Route path="/*" element={<PublicLayout />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  useEffect(() => {
    // Initialize ScrollTrigger
    ScrollTrigger.refresh();

    // Smooth scroll behavior
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor?.hash) {
        e.preventDefault();
        const element = document.querySelector(anchor.hash);
        if (element) {
          gsap.to(window, {
            duration: 1,
            scrollTo: { y: element, offsetY: 80 },
            ease: 'power3.inOut',
          });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      document.removeEventListener('click', handleAnchorClick);
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <AdminProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AdminProvider>
  );
}

export default App;
