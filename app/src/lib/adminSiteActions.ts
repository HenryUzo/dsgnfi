import { buildSiteScopedPath } from "./siteOverride";

export type SiteActionId =
  | "create_site"
  | "assign_template"
  | "complete_branding"
  | "complete_navigation"
  | "generate_preview"
  | "review_publish"
  | "connect_domain"
  | "open_editor"
  | "open_site_settings"
  | "view_public_site"
  | "open_template_library";

export type SiteAction = {
  id: SiteActionId;
  label: string;
  to: string;
};

export type SiteActionContext = {
  hasSite: boolean;
  siteSlug?: string | null;
  templateAssigned: boolean;
  brandingComplete: boolean;
  navigationComplete: boolean;
  domainConnected?: boolean;
  previewGenerated: boolean;
  publishedPagesCount: number;
  draftPagesCount?: number | null;
};

const actionDefinitions: Record<Exclude<SiteActionId, "view_public_site">, Omit<SiteAction, "to"> & { to: string }> = {
  create_site: {
    id: "create_site",
    label: "Create site",
    to: "/admin/sites",
  },
  assign_template: {
    id: "assign_template",
    label: "Assign template",
    to: "/admin/templates",
  },
  complete_branding: {
    id: "complete_branding",
    label: "Complete branding",
    to: "/admin/site-settings",
  },
  complete_navigation: {
    id: "complete_navigation",
    label: "Complete navigation",
    to: "/admin/site-settings",
  },
  generate_preview: {
    id: "generate_preview",
    label: "Generate preview",
    to: "/admin/site-settings",
  },
  review_publish: {
    id: "review_publish",
    label: "Review and publish",
    to: "/admin/pages",
  },
  connect_domain: {
    id: "connect_domain",
    label: "Connect domain",
    to: "/admin/site-settings",
  },
  open_editor: {
    id: "open_editor",
    label: "Open editor",
    to: "/admin/pages",
  },
  open_site_settings: {
    id: "open_site_settings",
    label: "Open site settings",
    to: "/admin/site-settings",
  },
  open_template_library: {
    id: "open_template_library",
    label: "Open template library",
    to: "/admin/templates",
  },
};

const nextActionLabelMap = {
  assign_template: actionDefinitions.assign_template.label,
  edit_branding: actionDefinitions.complete_branding.label,
  edit_navigation: actionDefinitions.complete_navigation.label,
  publish_pages: actionDefinitions.review_publish.label,
  connect_domain: actionDefinitions.connect_domain.label,
  create_preview: actionDefinitions.generate_preview.label,
  edit_home: actionDefinitions.open_editor.label,
} as const;

function hasDraftPages(context: SiteActionContext) {
  if (typeof context.draftPagesCount === "number") {
    return context.draftPagesCount > 0;
  }

  return context.publishedPagesCount === 0;
}

export function getRecommendedSiteAction(context: SiteActionContext): SiteAction {
  if (!context.hasSite) {
    return actionDefinitions.create_site;
  }

  if (!context.templateAssigned) {
    return actionDefinitions.assign_template;
  }

  if (!context.brandingComplete) {
    return actionDefinitions.complete_branding;
  }

  if (!context.navigationComplete) {
    return actionDefinitions.complete_navigation;
  }

  if (context.domainConnected === false) {
    return actionDefinitions.connect_domain;
  }

  if (!context.previewGenerated) {
    return actionDefinitions.generate_preview;
  }

  if (hasDraftPages(context)) {
    return actionDefinitions.review_publish;
  }

  return actionDefinitions.open_editor;
}

export function getSiteSecondaryActions(siteSlug?: string | null): SiteAction[] {
  return [
    {
      id: "view_public_site",
      label: "View public site",
      to: buildSiteScopedPath("/", siteSlug),
    },
    actionDefinitions.open_site_settings,
  ];
}

export function getStatusSummaryActionLabel(
  nextAction: "assign_template" | "edit_branding" | "edit_navigation" | "publish_pages" | "connect_domain" | "create_preview" | "edit_home"
) {
  return nextActionLabelMap[nextAction];
}
