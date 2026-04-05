import type { TemplateManifest } from "../types";

export const agencyStarterManifest: TemplateManifest = {
  key: "agency-starter",
  version: "1.0.0",
  name: "Agency Starter",
  category: "agency",
  description: "A service-led company site with portfolio and process storytelling defaults.",
  starterSiteSettings: {
    tagline: "Creative and digital growth partner.",
    contactEmail: "hello@example.com",
    seoTitle: "Agency Starter",
    seoDescription: "Starter template for agencies building a modern service site.",
    theme: {
      primaryColor: "#1D4ED8",
      accentColor: "#F97316",
    },
    locale: "en",
    timezone: "Africa/Lagos",
  },
  starterNavigation: {
    primary: ["Work", "Process", "Studio", "Insights", "Contact"],
  },
  starterContentHints: {
    homeSections: ["hero", "services", "featuredWork", "faq", "cta"],
    workEnabled: true,
    processEnabled: true,
  },
  editableFieldGroups: ["branding", "seo", "contact", "theme"],
};

