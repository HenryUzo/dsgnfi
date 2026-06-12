import { apiFetch } from "../lib/api";
import type {
  AdminSiteSummary,
  AdminTenantSummary,
  MembershipRole,
} from "../lib/cmsAdmin";

export type TemplateCategory =
  | "agency"
  | "healthcare"
  | "education"
  | "food"
  | "property"
  | "logistics";

export type TemplateManifestSummary = {
  starterNavigation?: {
    primary?: Array<
      | string
      | {
          label: string;
          pageKey?: string | null;
          href?: string | null;
          visible?: boolean;
        }
    >;
    footer?: Array<
      | string
      | {
          label: string;
          pageKey?: string | null;
          href?: string | null;
          visible?: boolean;
        }
    >;
  };
  starterContentHints?: {
    homeSections?: string[];
    workEnabled?: boolean;
    processEnabled?: boolean;
  };
  editableFieldGroups?: string[];
  homePreview?: {
    title: string;
    subtitle: string;
    sections: string[];
  };
};

export type TemplateSupportedPageDefinition = {
  pageKey: string;
  title: string;
  slug: string;
  isRequired: boolean;
  allowedBlockTypes: string[];
  defaultBlocks: Array<{
    id: string;
    type: string;
    data: Record<string, unknown>;
  }>;
  seoDefaults?: {
    seoTitle?: string | null;
    seoDescription?: string | null;
  };
};

export type TemplateAddablePageDefinition = {
  templateKey: string;
  label: string;
  description: string;
  defaultTitle: string;
  allowedBlockTypes: string[];
};

export type TemplateManifestDetail = TemplateManifestSummary & {
  key: string;
  version: string;
  name: string;
  category: TemplateCategory;
  description: string;
  starterSiteSettings?: {
    tagline?: string | null;
    contactPhone?: string | null;
    address?: string | null;
    contactEmail?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    theme?: Record<string, unknown> | null;
    locale?: string | null;
    timezone?: string | null;
    socialLinks?: Record<string, string> | null;
    logoUrl?: string | null;
    faviconUrl?: string | null;
  };
  supportedPages?: TemplateSupportedPageDefinition[];
  addablePageTemplates?: TemplateAddablePageDefinition[];
};

export type TemplateSummary = {
  id: string;
  key: string;
  name: string;
  category: TemplateCategory;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  sourceType?: "STARTER" | "CUSTOM";
  baseTemplateKey?: string | null;
  isActive?: boolean;
  createdBy?: string | null;
  activeVersion: {
    id?: string;
    version: string;
    manifestKey: string;
  } | null;
  usageCount?: number;
  lastPublishedAt?: string | null;
  manifest?: TemplateManifestSummary;
};

export type TemplateDetail = {
  id: string;
  key: string;
  name: string;
  category: TemplateCategory;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  sourceType?: "STARTER" | "CUSTOM";
  baseTemplateKey?: string | null;
  isActive?: boolean;
  createdBy?: string | null;
  usageCount?: number;
  lastPublishedAt?: string | null;
  activeVersion: {
    id: string;
    version: string;
    manifestKey: string;
  } | null;
  manifest: TemplateManifestDetail;
  publishedManifest?: TemplateManifestDetail | null;
};

export type SiteTemplateSummary = {
  id: string;
  key: string;
  name: string;
  category: string;
} | null;

export type SiteTemplateVersionSummary = {
  id: string;
  version: string;
  manifestKey: string;
} | null;

export type SiteSettingsSummary = {
  logoUrl: string | null;
  faviconUrl: string | null;
  tagline: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  socialLinks: Record<string, unknown> | null;
  seoTitle: string | null;
  seoDescription: string | null;
  theme: Record<string, unknown> | null;
  locale: string | null;
  timezone: string | null;
} | null;

export type AdminSite = AdminSiteSummary & {
  createdAt?: string;
  updatedAt?: string;
  template: SiteTemplateSummary;
  templateVersion: SiteTemplateVersionSummary;
  templateSourceType?: "STARTER" | "CUSTOM" | null;
  templateBaseKey?: string | null;
  statusSummary?: {
    templateAssigned: boolean;
    brandingReady: boolean;
    navigationReady: boolean;
    publishedPagesCount: number;
    domainReady: boolean;
    previewReady: boolean;
    nextAction:
      | "assign_template"
      | "edit_branding"
      | "edit_navigation"
      | "publish_pages"
      | "connect_domain"
      | "create_preview"
      | "edit_home";
  };
};

export type AdminSiteDetail = AdminSite & {
  settings: SiteSettingsSummary;
  templateRelationship?: {
    sourceType: "STARTER" | "CUSTOM" | null;
    baseTemplateKey: string | null;
    activeVersionUsed: {
      id: string;
      version: string;
      manifestKey: string;
    } | null;
    hasTemplateDrift: boolean;
  };
};

export type CreateSiteInput = {
  name: string;
  slug: string;
  templateKey?: string | null;
};

export type UpdateSiteTemplateInput = {
  templateKey: string;
  templateVersion?: string | null;
};

export type CreateTemplateInput = {
  name: string;
  description: string;
  category: TemplateCategory;
  sourceTemplateKey?: string | null;
  sourceSiteId?: string | null;
};

export type UpdateTemplateInput = {
  name: string;
  description: string;
  category: TemplateCategory;
  presetOverrides: Record<string, unknown>;
};

export type TemplateUsageSite = {
  id: string;
  name: string;
  slug: string;
  status: string;
  templateVersion: {
    id: string;
    version: string;
    manifestKey: string;
  } | null;
  hasTemplateDrift: boolean;
};

export type TemplateImportReport = {
  source: string;
  importer: string;
  originalFilename: string;
  detectedRoot: string;
  routes: Array<{ path: string; pageKey: string; component: string }>;
  mappedPages: string[];
  mappedSections: string[];
  copiedAssets: Array<{ source: string; url: string }>;
  unsupportedComponents: string[];
  warnings: string[];
};

export type TemplateImportResult = {
  id: string;
  status: "READY" | "PUBLISHED";
  report: TemplateImportReport;
  template: TemplateDetail | null;
};

export type SwitchSiteResponse = {
  ok: true;
  currentTenant: AdminTenantSummary | null;
  currentSite: AdminSiteSummary | null;
  currentRole: MembershipRole | null;
};

export async function getAdminSites() {
  const response = await apiFetch<{ ok: true; sites: AdminSite[] }>("/admin/sites");
  return response.sites;
}

export async function getAdminSite(siteId: string) {
  const response = await apiFetch<{ ok: true; site: AdminSiteDetail }>(
    `/admin/sites/${siteId}`
  );
  return response.site;
}

export async function createAdminSite(input: CreateSiteInput) {
  const response = await apiFetch<{ ok: true; site: AdminSiteDetail }>("/admin/sites", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.site;
}

export async function updateAdminSiteTemplate(
  siteId: string,
  input: UpdateSiteTemplateInput
) {
  const response = await apiFetch<{ ok: true; site: AdminSiteDetail }>(
    `/admin/sites/${siteId}/template`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
  return response.site;
}

export async function getAdminTemplates(options?: {
  category?: string | null;
  scope?: "all" | "starter" | "custom";
}) {
  const params = new URLSearchParams();
  if (options?.category) {
    params.set("category", options.category);
  }
  if (options?.scope) {
    params.set("scope", options.scope);
  }
  const search = params.size > 0 ? `?${params.toString()}` : "";
  const response = await apiFetch<{ ok: true; templates: TemplateSummary[] }>(
    `/admin/templates${search}`
  );
  return response.templates;
}

export async function getAdminTemplate(templateKey: string) {
  const response = await apiFetch<{ ok: true; template: TemplateDetail }>(
    `/admin/templates/${templateKey}`
  );
  return response.template;
}

export async function createAdminTemplate(input: CreateTemplateInput) {
  const response = await apiFetch<{ ok: true; template: TemplateDetail }>(
    "/admin/templates",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  return response.template;
}

export async function updateAdminTemplate(templateId: string, input: UpdateTemplateInput) {
  const response = await apiFetch<{ ok: true; template: TemplateDetail }>(
    `/admin/templates/${templateId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
  return response.template;
}

export async function publishAdminTemplate(templateId: string) {
  const response = await apiFetch<{ ok: true; template: TemplateDetail }>(
    `/admin/templates/${templateId}/publish`,
    {
      method: "POST",
    }
  );
  return response.template;
}

export async function importAdminTemplateBundle(file: File) {
  const formData = new FormData();
  formData.append("bundle", file);

  const response = await apiFetch<{ ok: true; import: TemplateImportResult }>(
    "/admin/templates/imports",
    {
      method: "POST",
      body: formData,
    }
  );
  return response.import;
}

export async function publishAdminTemplateImport(importId: string) {
  const response = await apiFetch<{ ok: true; template: TemplateDetail }>(
    `/admin/templates/imports/${importId}/publish`,
    {
      method: "POST",
    }
  );
  return response.template;
}

export async function getAdminTemplateUsages(templateId: string) {
  const response = await apiFetch<{ ok: true; sites: TemplateUsageSite[] }>(
    `/admin/templates/${templateId}/usages`
  );
  return response.sites;
}

export async function switchAdminSite(siteId: string) {
  return apiFetch<SwitchSiteResponse>("/auth/switch-site", {
    method: "POST",
    body: JSON.stringify({ siteId }),
  });
}
