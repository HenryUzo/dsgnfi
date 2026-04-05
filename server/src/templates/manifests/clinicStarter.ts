import { buildStarterSupportedPages } from "../pageDefaults";
import type { TemplateManifest } from "../types";

export const clinicStarterManifest: TemplateManifest = {
  key: "clinic-starter",
  version: "1.0.0",
  name: "Clinic Starter",
  category: "healthcare",
  description: "A healthcare-focused starter with trust, services, and contact defaults.",
  starterSiteSettings: {
    tagline: "Patient-centered care with a modern digital front door.",
    contactEmail: "appointments@example.com",
    seoTitle: "Clinic Starter",
    seoDescription: "Starter template for clinics and medical practices.",
    theme: {
      primaryColor: "#0F766E",
      accentColor: "#E2E8F0",
    },
    locale: "en",
    timezone: "Africa/Lagos",
  },
  starterNavigation: {
    primary: ["Services", "Doctors", "Process", "FAQ", "Contact"],
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
