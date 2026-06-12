import { Dribbble, Instagram, Linkedin } from "lucide-react";

import { SiteScopedLink } from "./SiteScopedLink";
import { usePublicSite } from "../site/PublicSiteContext";

const fallbackFooterLinks = [
  { id: "footer-work", label: "Work", href: "/work" },
  { id: "footer-process", label: "Process", href: "/process" },
  { id: "footer-contact", label: "Contact", href: "/contact" },
  { id: "footer-privacy", label: "Privacy Policy", href: "/privacy-policy" },
];

const socialIconMap = {
  linkedin: Linkedin,
  instagram: Instagram,
  dribbble: Dribbble,
  behance: () => <span className="text-sm font-bold">Be</span>,
  clutch: () => <span className="text-sm font-bold">C</span>,
} as const;

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

function FooterLink({
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

export function Footer() {
  const { presentation } = usePublicSite();
  const footerLinks = presentation ? presentation.navigation.footer : fallbackFooterLinks;
  const socialLinks = Object.entries(presentation?.settings.socialLinks ?? {});
  const tagline =
    presentation?.settings.tagline ??
    "The branding agency for visionaries, challengers, and changemakers.";
  const address = presentation?.settings.address;
  const siteName = presentation?.site.name ?? "Dsgnfi";

  return (
    <footer className="site-default-footer bg-[var(--brand)] text-white">
      <div className="w-full px-6 py-20 lg:px-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <h2 className="mb-8 font-serif text-4xl leading-tight md:text-5xl lg:text-6xl">
              {tagline}
            </h2>
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white">
              <span className="text-2xl font-bold">{siteName.slice(0, 2).toLowerCase()}</span>
            </div>
          </div>

          <div className="lg:col-span-3">
            <h3 className="mb-6 text-xs font-medium uppercase tracking-wider text-white/60">
              Navigation
            </h3>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.id}>
                  <FooterLink
                    href={link.href}
                    label={link.label}
                    className="text-white/80 transition-colors duration-300 hover:text-white"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="mb-6 text-xs font-medium uppercase tracking-wider text-white/60">
              Socials
            </h3>
            {socialLinks.length > 0 ? (
              <ul className="space-y-3">
                {socialLinks.map(([label, href]) => {
                  const key = label.toLowerCase();
                  const Icon = socialIconMap[key as keyof typeof socialIconMap];

                  return (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-white/80 transition-colors duration-300 hover:text-white"
                      >
                        {Icon ? <Icon /> : null}
                        <span>{label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-white/70">
                Add social links from Site Settings to show them here.
              </p>
            )}
          </div>

          <div className="lg:col-span-2">
            <h3 className="mb-6 text-xs font-medium uppercase tracking-wider text-white/60">
              Contact
            </h3>
            <div className="space-y-3 text-white/80">
              {presentation?.settings.contactEmail ? <p>{presentation.settings.contactEmail}</p> : null}
              {presentation?.settings.contactPhone ? <p>{presentation.settings.contactPhone}</p> : null}
              {address ? <p className="whitespace-pre-line">{address}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-start justify-between gap-4 border-t border-white/20 pt-8 md:flex-row md:items-center">
          <SiteScopedLink
            to="/privacy-policy"
            className="text-sm text-white/60 transition-colors duration-300 hover:text-white"
          >
            Privacy Policy
          </SiteScopedLink>
          <p className="text-sm text-white/60">
            {address ?? `${siteName} is ready for site-specific address details.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
