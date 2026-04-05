import type { TemplateManifest } from "../types";

export const restaurantStarterManifest: TemplateManifest = {
  key: "restaurant-starter",
  version: "1.0.0",
  name: "Restaurant Starter",
  category: "food",
  description: "A food and hospitality starter centered on menu, story, and reservations.",
  starterSiteSettings: {
    tagline: "A memorable dining experience, online and in person.",
    contactEmail: "reservations@example.com",
    seoTitle: "Restaurant Starter",
    seoDescription: "Starter template for restaurants and hospitality brands.",
    theme: {
      primaryColor: "#7C2D12",
      accentColor: "#F59E0B",
    },
    locale: "en",
    timezone: "Africa/Lagos",
  },
  starterNavigation: {
    primary: ["Menu", "Story", "Reservations", "Process", "Contact"],
  },
  starterContentHints: {
    homeSections: ["hero", "services", "cta"],
    workEnabled: false,
    processEnabled: true,
  },
  editableFieldGroups: ["branding", "seo", "contact", "theme"],
};

