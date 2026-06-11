import { apiFetch } from "../lib/api";

export type ThemeSettings = {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonRadius?: number;
};

export type NavigationItem = {
  id: string;
  label: string;
  pageKey: string | null;
  href: string | null;
  visible: boolean;
  order: number;
};

export type PublicNavigationItem = NavigationItem & {
  href: string;
};

export type PageHierarchyRole = "MAIN" | "INNER";

export type PageHierarchy = {
  role: PageHierarchyRole;
  defaultParentPageKey: string | null;
  defaultParentTitle: string | null;
  defaultParentSlug: string | null;
};

export type PublicSitePageSummary = {
  pageKey: string;
  title: string;
  slug: string;
  hierarchy: PageHierarchy;
};

export type SitePresentationSettings = {
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  tagline: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  socialLinks: Record<string, string>;
  seoTitle: string | null;
  seoDescription: string | null;
  locale: string | null;
  timezone: string | null;
};

export type SitePresentation = {
  site: {
    id: string;
    name: string;
    slug: string;
  };
  settings: SitePresentationSettings;
  theme: ThemeSettings;
  pages: PublicSitePageSummary[];
  navigation: {
    primary: PublicNavigationItem[];
    footer: PublicNavigationItem[];
  };
};

export type SiteSettingsDetail = SitePresentation;

export type SiteAsset = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  altText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PreviewTokenSummary = {
  id: string;
  pageKey: string | null;
  expiresAt: string;
  revokedAt: string | null;
  note: string | null;
  createdAt: string;
};

export type PreviewTokenCreated = PreviewTokenSummary & {
  token: string;
  previewUrl: string;
  previewApiPath?: string;
};

export type SiteDomain = {
  id: string;
  hostname: string;
  type: "SUBDOMAIN" | "CUSTOM";
  isPrimary: boolean;
  verificationStatus: "PENDING" | "VERIFIED" | "FAILED";
  verifiedAt: string | null;
  verificationInstructions: {
    host: string;
    type: "TXT";
    value: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPageSummary = {
  id: string;
  pageKey: string;
  title: string;
  slug: string;
  isVisible: boolean;
  isRequired: boolean;
  canDelete: boolean;
  status: "DRAFT" | "PUBLISHED";
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
  draftRevisionNumber: number | null;
  publishedRevisionNumber: number | null;
  publishedAt: string | null;
  lineage: AdminPageLineage;
  hierarchy: PageHierarchy;
};

export type AdminPageTemplateSummary = {
  templateKey: string;
  label: string;
  description: string;
  defaultTitle: string;
  allowedBlockTypes: string[];
};

export type PageBlockRecord = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

export type AdminPageLineage = {
  sourceTemplateKey: string | null;
  sourceTemplateName: string | null;
  sourceTemplateVersion: string | null;
  sourcePageBlueprintKey: string | null;
  status: "UNTRACKED" | "INHERITED" | "MODIFIED";
  isTracked: boolean;
};

export type AdminPageDetail = AdminPageSummary & {
  pageTemplateKey?: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  allowedBlockTypes: string[];
  content: {
    blocks: PageBlockRecord[];
  };
};

export type PublicPageDetail = {
  pageKey: string;
  title: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  revisionNumber: number;
  hierarchy: PageHierarchy;
  content: {
    blocks: PageBlockRecord[];
  };
};

export type SiteSettingsInput = SitePresentationSettings & {
  theme: ThemeSettings;
};

export async function getAdminSiteSettings() {
  const response = await apiFetch<{ ok: true; site: SiteSettingsDetail }>(
    "/admin/site-settings"
  );
  return response.site;
}

export async function updateAdminSiteSettings(input: SiteSettingsInput) {
  const response = await apiFetch<{ ok: true; site: SiteSettingsDetail }>(
    "/admin/site-settings",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
  return response.site;
}

export async function getAdminSiteNavigation() {
  const response = await apiFetch<{
    ok: true;
    navigation: { primary: NavigationItem[]; footer: NavigationItem[] };
  }>("/admin/site-settings/navigation");
  return response.navigation;
}

export async function listAdminPages() {
  const response = await apiFetch<{ ok: true; pages: AdminPageSummary[] }>("/admin/pages");
  return response.pages;
}

export async function listAdminPageTemplates() {
  const response = await apiFetch<{ ok: true; templates: AdminPageTemplateSummary[] }>(
    "/admin/pages/catalog"
  );
  return response.templates;
}

export async function createAdminPage(input: {
  templateKey: string;
  title: string;
  slug: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isVisible?: boolean;
  hierarchyRole?: PageHierarchyRole;
  defaultParentPageKey?: string | null;
}) {
  const response = await apiFetch<{ ok: true; page: AdminPageDetail }>("/admin/pages", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.page;
}

export async function updateAdminPageMeta(
  pageKey: string,
  input: {
    title: string;
    slug: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    hierarchyRole: PageHierarchyRole;
    defaultParentPageKey?: string | null;
  }
) {
  const response = await apiFetch<{ ok: true; page: AdminPageDetail }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/meta`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
  return response.page;
}

export async function renameAdminPageTitle(pageKey: string, title: string) {
  const response = await apiFetch<{ ok: true; page: AdminPageDetail }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/title`,
    {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }
  );
  return response.page;
}

export async function setAdminPageVisibility(pageKey: string, isVisible: boolean) {
  const response = await apiFetch<{ ok: true; page: AdminPageDetail }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/visibility`,
    {
      method: "PATCH",
      body: JSON.stringify({ isVisible }),
    }
  );
  return response.page;
}

export async function duplicateAdminPage(pageKey: string) {
  const response = await apiFetch<{ ok: true; page: AdminPageDetail }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/duplicate`,
    {
      method: "POST",
    }
  );
  return response.page;
}

export async function deleteAdminPage(pageKey: string) {
  const response = await apiFetch<{ ok: true; pageKey: string }>(
    `/admin/pages/${encodeURIComponent(pageKey)}`,
    {
      method: "DELETE",
    }
  );
  return response.pageKey;
}

export async function getAdminPageDraft(pageKey: string) {
  const response = await apiFetch<{ ok: true; page: AdminPageDetail }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/draft`
  );
  return response.page;
}

export async function saveAdminPageDraft(
  pageKey: string,
  input: {
    title: string;
    slug: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    content: { blocks: PageBlockRecord[] };
  }
) {
  const response = await apiFetch<{ ok: true; page: AdminPageDetail }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/draft`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    }
  );
  return response.page;
}

export async function publishAdminPage(pageKey: string) {
  const response = await apiFetch<{ ok: true; page: AdminPageDetail }>(
    `/admin/pages/${encodeURIComponent(pageKey)}/publish`,
    {
      method: "POST",
    }
  );
  return response.page;
}

export async function updateAdminSiteNavigation(input: {
  primaryNavigation: NavigationItem[];
  footerNavigation: NavigationItem[];
}) {
  const response = await apiFetch<{
    ok: true;
    navigation: { primary: PublicNavigationItem[]; footer: PublicNavigationItem[] };
  }>("/admin/site-settings/navigation", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.navigation;
}

export async function listAdminAssets() {
  const response = await apiFetch<{ ok: true; assets: SiteAsset[] }>("/admin/assets");
  return response.assets;
}

export async function uploadAdminAsset(file: File, altText?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (altText) {
    formData.append("altText", altText);
  }

  const response = await apiFetch<{ ok: true; asset: SiteAsset }>("/admin/assets", {
    method: "POST",
    body: formData,
  });
  return response.asset;
}

export async function updateAdminAsset(
  assetId: string,
  input: { filename?: string; altText?: string | null }
) {
  const response = await apiFetch<{ ok: true; asset: SiteAsset }>(
    `/admin/assets/${assetId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
  return response.asset;
}

export async function deleteAdminAsset(assetId: string) {
  await apiFetch<void>(`/admin/assets/${assetId}`, {
    method: "DELETE",
  });
}

export async function listAdminDomains() {
  const response = await apiFetch<{ ok: true; domains: SiteDomain[] }>("/admin/domains");
  return response.domains;
}

export async function createAdminDomain(
  input:
    | { type: "SUBDOMAIN"; subdomainLabel: string }
    | { type: "CUSTOM"; hostname: string }
) {
  const response = await apiFetch<{ ok: true; domain: SiteDomain }>("/admin/domains", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.domain;
}

export async function verifyAdminDomain(domainId: string) {
  const response = await apiFetch<{ ok: true; domain: SiteDomain }>(
    `/admin/domains/${domainId}/verify`,
    { method: "POST" }
  );
  return response.domain;
}

export async function setPrimaryAdminDomain(domainId: string) {
  const response = await apiFetch<{ ok: true; domain: SiteDomain }>(
    `/admin/domains/${domainId}/set-primary`,
    { method: "POST" }
  );
  return response.domain;
}

export async function deleteAdminDomain(domainId: string) {
  await apiFetch<void>(`/admin/domains/${domainId}`, { method: "DELETE" });
}

export async function listAdminPreviewTokens() {
  const response = await apiFetch<{ ok: true; tokens: PreviewTokenSummary[] }>(
    "/admin/preview"
  );
  return response.tokens;
}

export async function createAdminPreviewToken(input: {
  pageKey?: string | null;
  note?: string | null;
  expiresInMinutes?: number;
}) {
  const response = await apiFetch<{ ok: true; token: PreviewTokenCreated }>(
    "/admin/preview/token",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  return response.token;
}

export async function revokeAdminPreviewToken(tokenId: string) {
  await apiFetch<void>(`/admin/preview/${tokenId}`, { method: "DELETE" });
}

export async function getPublicSite() {
  const response = await apiFetch<{
    ok: true;
    site: SitePresentation["site"];
    settings: SitePresentation["settings"];
    theme: SitePresentation["theme"];
    pages: SitePresentation["pages"];
    navigation: SitePresentation["navigation"];
  }>("/public/site");

  return {
    site: response.site,
    settings: response.settings,
    theme: response.theme,
    pages: response.pages,
    navigation: response.navigation,
  };
}

export async function getPublicSiteSettings() {
  const response = await apiFetch<{ ok: true; settings: SitePresentationSettings }>(
    "/public/site/settings"
  );
  return response.settings;
}

export async function getPublicSiteTheme() {
  const response = await apiFetch<{ ok: true; theme: ThemeSettings }>(
    "/public/site/theme"
  );
  return response.theme;
}

export async function getPublicSiteNavigation() {
  const response = await apiFetch<{
    ok: true;
    navigation: { primary: PublicNavigationItem[]; footer: PublicNavigationItem[] };
  }>("/public/site/navigation");
  return response.navigation;
}

export async function getPublicPageBySlug(slug: string) {
  const response = await apiFetch<{ ok: true; page: PublicPageDetail }>(
    `/public/pages/by-slug?slug=${encodeURIComponent(slug)}`
  );
  return response.page;
}

export async function getPublicPreviewPage(pageKey: string, token: string) {
  const response = await apiFetch<{
    ok: true;
    presentation?: SitePresentation;
    page: {
      id: string;
      pageKey: string;
      title: string;
      slug: string;
      status: "DRAFT" | "PUBLISHED";
      seoTitle: string | null;
      seoDescription: string | null;
      updatedAt: string;
      revisionNumber: number;
      hierarchy: PageHierarchy;
      content: { blocks: Array<Record<string, unknown>> };
    };
    preview: {
      tokenId: string;
      pageKey: string | null;
      expiresAt: string;
    };
  }>(buildPreviewApiPath(pageKey, token));
  return response;
}

export function buildPreviewApiPath(pageKey: string, token: string) {
  return `/public/preview/pages/${encodeURIComponent(pageKey)}?token=${encodeURIComponent(token)}`;
}
