import { buildStarterSupportedPages } from "../pageDefaults";
import type { TemplateManifest } from "../types";

export const schoolStarterManifest: TemplateManifest = {
  key: "school-starter",
  version: "1.0.0",
  name: "School Starter",
  category: "education",
  description: "An education starter emphasizing programs, admissions, and campus highlights.",
  starterSiteSettings: {
    tagline: "A learning environment built for curiosity and growth.",
    contactEmail: "admissions@example.com",
    seoTitle: "School Starter",
    seoDescription: "Starter template for schools and academic institutions.",
    theme: {
      primaryColor: "#1D4ED8",
      accentColor: "#FACC15",
    },
    locale: "en",
    timezone: "Africa/Lagos",
  },
  starterNavigation: {
    primary: ["Programs", "Admissions", "Campus Life", "Process", "Contact"],
  },
  starterContentHints: {
    homeSections: ["hero", "services", "faq", "cta"],
    workEnabled: false,
    processEnabled: true,
  },
  editableFieldGroups: ["branding", "seo", "contact", "theme"],
  supportedPages: buildStarterSupportedPages({
    processEnabled: true,
    workEnabled: false,
  }),
};
