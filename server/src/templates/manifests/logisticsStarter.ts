import type { TemplateManifest } from "../types";

export const logisticsStarterManifest: TemplateManifest = {
  key: "logistics-starter",
  version: "1.0.0",
  name: "Logistics Starter",
  category: "logistics",
  description: "A conversion-focused starter for supply chain, fleet, and distribution companies.",
  starterSiteSettings: {
    tagline: "Reliable movement across supply chains and markets.",
    contactEmail: "operations@example.com",
    seoTitle: "Logistics Starter",
    seoDescription: "Starter template for logistics and transportation businesses.",
    theme: {
      primaryColor: "#0F172A",
      accentColor: "#06B6D4",
    },
    locale: "en",
    timezone: "Africa/Lagos",
  },
  starterNavigation: {
    primary: ["Services", "Coverage", "Process", "FAQ", "Contact"],
  },
  starterContentHints: {
    homeSections: ["hero", "services", "faq", "cta"],
    workEnabled: false,
    processEnabled: true,
  },
  editableFieldGroups: ["branding", "seo", "contact", "theme"],
};

