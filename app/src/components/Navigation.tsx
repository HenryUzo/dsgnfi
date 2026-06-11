import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { SiteScopedLink } from "./SiteScopedLink";
import { usePublicSite } from "../site/PublicSiteContext";

type NavItem = {
  id: string;
  label: string;
  href: string;
};

const fallbackNavLinks: NavItem[] = [
  { id: "work", label: "Work", href: "/work" },
  { id: "process", label: "Process", href: "/process" },
  { id: "studio", label: "Studio", href: "/studio" },
  { id: "insights", label: "Insights", href: "/insights" },
];

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

function NavLinkItem({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }

  return (
    <SiteScopedLink to={href} className={className}>
      {label}
    </SiteScopedLink>
  );
}

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { presentation } = usePublicSite();
  const isBannerPage =
    location.pathname.startsWith("/work/") || location.pathname === "/process";

  const logoUrl = presentation?.settings.logoUrl ?? "";
  const logoAlt = `${presentation?.site.name ?? "Dsgnfi"} logo`;
  const siteLabel = presentation?.site.name ?? "Dsgnfi";

  const navLinks = useMemo<NavItem[]>(() => {
    const items = presentation?.navigation.primary;
    if (!presentation) {
      return fallbackNavLinks;
    }

    return (items ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
    }));
  }, [presentation]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <>
      <nav
        className={`site-default-navigation fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
          !isBannerPage && isScrolled
            ? "border-b border-white/5 bg-black/80 backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="w-full px-6 lg:px-12">
          <div className="flex h-20 items-center justify-between">
            <SiteScopedLink to="/" className="flex items-center gap-2 group">
              {logoUrl ? (
                <img src={logoUrl} alt={logoAlt} className="h-8 w-auto object-contain" />
              ) : (
                <span className="text-2xl font-bold tracking-tight text-white">
                  {siteLabel}
                </span>
              )}
            </SiteScopedLink>

            <div className="hidden items-center gap-10 md:flex">
              {navLinks.map((link) => (
                <div key={link.id} className="group relative">
                  <NavLinkItem
                    href={link.href}
                    label={link.label}
                    className="text-sm text-white/70 transition-colors duration-300 hover:text-white"
                  />
                  <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-white transition-all duration-300 group-hover:w-full" />
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <SiteScopedLink
                to="/contact"
                className="inline-flex items-center rounded-full bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white transition-colors duration-300 hover:bg-[var(--brand-dark)]"
              >
                Contact
              </SiteScopedLink>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen((value) => !value)}
              className="p-2 text-white md:hidden"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`site-default-navigation fixed inset-0 z-40 bg-black transition-all duration-500 md:hidden ${
          isMobileMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex h-full flex-col items-center justify-center gap-8">
          {navLinks.map((link) => (
            <NavLinkItem
              key={link.id}
              href={link.href}
              label={link.label}
              className="font-serif text-3xl text-white transition-colors duration-300 hover:text-[var(--brand)]"
            />
          ))}
          <SiteScopedLink
            to="/contact"
            className="mt-4 inline-flex items-center rounded-full bg-[var(--brand)] px-8 py-3 text-lg font-medium text-white"
          >
            Contact
          </SiteScopedLink>
        </div>
      </div>
    </>
  );
}
