export type TemplateCategory =
  | "agency"
  | "healthcare"
  | "education"
  | "food"
  | "property"
  | "logistics";

export const SYSTEM_PAGE_KEYS = [
  "home",
  "about",
  "contact",
  "process",
  "work",
] as const;

export type SystemPageKey = (typeof SYSTEM_PAGE_KEYS)[number];
export type PageKey = string;

export type PageBlockType = string;

export type PageBlockInput = {
  id: string;
  type: PageBlockType;
  data: Record<string, unknown>;
};

export type TemplateNavigationPresetItem =
  | string
  | {
      label: string;
      pageKey?: PageKey | null;
      href?: string | null;
      visible?: boolean;
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

export type AddablePageTemplateDefinition = {
  templateKey: string;
  label: string;
  description: string;
  defaultTitle: string;
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

export type TemplateStarterContentHints = {
  homeSections: string[];
  workEnabled: boolean;
  processEnabled: boolean;
};

export type SupportedPageOverride = {
  pageKey: PageKey;
  title?: string;
  slug?: string;
  isRequired?: boolean;
  allowedBlockTypes?: PageBlockType[];
  defaultBlocks?: PageBlockInput[];
  seoDefaults?: {
    seoTitle?: string | null;
    seoDescription?: string | null;
  };
};

export type TemplatePresetOverrides = {
  starterSiteSettings?: StarterSiteSettings;
  starterNavigation?: {
    primary?: TemplateNavigationPresetItem[];
    footer?: TemplateNavigationPresetItem[];
  };
  starterContentHints?: Partial<TemplateStarterContentHints>;
  replaceSupportedPages?: boolean;
  supportedPages?: SupportedPageOverride[];
  importProvenance?: Record<string, unknown>;
};

export type TemplateManifest = {
  key: string;
  version: "1.0.0";
  name: string;
  category: TemplateCategory;
  description: string;
  starterSiteSettings: StarterSiteSettings;
  starterNavigation: {
    primary: TemplateNavigationPresetItem[];
    footer?: TemplateNavigationPresetItem[];
  };
  starterContentHints: TemplateStarterContentHints;
  editableFieldGroups: string[];
  supportedPages: SupportedPageDefinition[];
  addablePageTemplates?: AddablePageTemplateDefinition[];
};
