export type TemplateCategory =
  | "agency"
  | "healthcare"
  | "education"
  | "food"
  | "property"
  | "logistics";

export type PageKey = "home" | "about" | "contact" | "process" | "work";

export type PageBlockType =
  | "hero"
  | "richText"
  | "features"
  | "faq"
  | "cta"
  | "contact"
  | "stats"
  | "gallery";

export type PageBlockInput = {
  id: string;
  type: PageBlockType;
  data: Record<string, unknown>;
};

export type SupportedPageDefinition = {
  pageKey: PageKey;
  title: string;
  slug: string;
  isRequired: boolean;
  allowedBlockTypes: PageBlockType[];
  defaultBlocks: PageBlockInput[];
  seoDefaults?: {
    seoTitle?: string;
    seoDescription?: string;
  };
};

export type StarterSiteSettings = {
  tagline?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  socialLinks?: Record<string, string> | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  theme?: Record<string, unknown> | null;
  locale?: string | null;
  timezone?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
};

export type TemplateManifest = {
  key: string;
  version: "1.0.0";
  name: string;
  category: TemplateCategory;
  description: string;
  starterSiteSettings: StarterSiteSettings;
  starterNavigation: {
    primary: string[];
  };
  starterContentHints: {
    homeSections: string[];
    workEnabled: boolean;
    processEnabled: boolean;
  };
  editableFieldGroups: string[];
  supportedPages: SupportedPageDefinition[];
};
