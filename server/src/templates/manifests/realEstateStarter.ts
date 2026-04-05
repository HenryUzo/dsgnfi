import type { TemplateManifest } from "../types";

export const realEstateStarterManifest: TemplateManifest = {
  key: "real-estate-starter",
  version: "1.0.0",
  name: "Real Estate Starter",
  category: "property",
  description: "A property-focused starter for developers, brokerages, and listing-driven brands.",
  starterSiteSettings: {
    tagline: "Property marketing and trust-building for modern buyers.",
    contactEmail: "sales@example.com",
    seoTitle: "Real Estate Starter",
    seoDescription: "Starter template for real-estate businesses and property brands.",
    theme: {
      primaryColor: "#111827",
      accentColor: "#10B981",
    },
    locale: "en",
    timezone: "Africa/Lagos",
  },
  starterNavigation: {
    primary: ["Listings", "About", "Process", "Insights", "Contact"],
  },
  starterContentHints: {
    homeSections: ["hero", "services", "featuredWork", "cta"],
    workEnabled: true,
    processEnabled: true,
  },
  editableFieldGroups: ["branding", "seo", "contact", "theme"],
};

