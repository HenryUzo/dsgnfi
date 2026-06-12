import {
  getRecommendedSiteAction,
  getSiteSecondaryActions,
  type SiteActionContext,
  type SiteAction,
} from "../../../lib/adminSiteActions";
import type { AdminSite, AdminSiteDetail } from "../../../services/adminSites";

export type SetupItemState = "complete" | "needs_action" | "blocked";

export type SiteChecklistItem = {
  key:
    | "template"
    | "branding"
    | "navigation"
    | "domain"
    | "homepage";
  label: string;
  helper: string;
  state: SetupItemState;
  action?: {
    label: string;
    to: string;
  };
};

export type SiteActionSet = {
  primary: SiteAction;
  secondary: SiteAction[];
};

export type TenantSiteStats = {
  total: number;
  active: number;
  draft: number;
  blocked: number;
  averageProgress: number;
};

type SiteLike = AdminSite | AdminSiteDetail | null | undefined;

type SiteMetrics = {
  hasTemplate: boolean;
  brandingReady: boolean;
  navigationReady: boolean;
  domainReady: boolean;
  homepageApproved: boolean;
  previewReady: boolean;
};

function getSiteMetrics(site: SiteLike): SiteMetrics {
  return {
    hasTemplate: Boolean(site?.template),
    brandingReady: Boolean(site?.statusSummary?.brandingReady),
    navigationReady: Boolean(site?.statusSummary?.navigationReady),
    domainReady: Boolean(site?.statusSummary?.domainReady),
    homepageApproved: Boolean((site?.statusSummary?.publishedPagesCount ?? 0) > 0),
    previewReady: Boolean(site?.statusSummary?.previewReady),
  };
}

function makeState(
  ready: boolean,
  fallback: SetupItemState = "needs_action"
): SetupItemState {
  return ready ? "complete" : fallback;
}

function toActionContext(site: SiteLike): SiteActionContext {
  const metrics = getSiteMetrics(site);

  return {
    hasSite: Boolean(site),
    siteSlug: site?.slug,
    templateAssigned: metrics.hasTemplate,
    brandingComplete: metrics.brandingReady,
    navigationComplete: metrics.navigationReady,
    domainConnected: metrics.domainReady,
    previewGenerated: metrics.previewReady,
    publishedPagesCount: site?.statusSummary?.publishedPagesCount ?? 0,
  };
}

export function formatSiteTimestamp(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

export function getSiteLastEdited(site: SiteLike) {
  return formatSiteTimestamp(site?.updatedAt ?? site?.createdAt);
}

export function getTemplateName(site: SiteLike) {
  return site?.template?.name ?? "No template assigned";
}

export function getSetupChecklist(site: SiteLike): SiteChecklistItem[] {
  const metrics = getSiteMetrics(site);

  return [
    {
      key: "template",
      label: "Template selected",
      helper: metrics.hasTemplate
        ? `Using ${getTemplateName(site)}.`
        : "Choose a starter or custom template before setup can continue.",
      state: makeState(metrics.hasTemplate),
      action: metrics.hasTemplate
        ? undefined
        : { label: "Assign template", to: "/admin/templates" },
    },
    {
      key: "branding",
      label: "Branding configured",
      helper: metrics.brandingReady
        ? "Core identity, SEO, and brand contact details are in place."
        : metrics.hasTemplate
          ? "Complete name, tagline, brand assets, and SEO defaults."
          : "Blocked until a template is assigned.",
      state: metrics.brandingReady
        ? "complete"
        : metrics.hasTemplate
          ? "needs_action"
          : "blocked",
      action: metrics.brandingReady
        ? undefined
        : { label: "Open site settings", to: "/admin/site-settings" },
    },
    {
      key: "navigation",
      label: "Navigation configured",
      helper: metrics.navigationReady
        ? "Primary and footer navigation have been set."
        : metrics.hasTemplate
          ? "Review the page links visitors will use across the site."
          : "Blocked until a template is assigned.",
      state: metrics.navigationReady
        ? "complete"
        : metrics.hasTemplate
          ? "needs_action"
          : "blocked",
      action: metrics.navigationReady
        ? undefined
        : { label: "Review navigation", to: "/admin/site-settings" },
    },
    {
      key: "domain",
      label: "Domain connected",
      helper: metrics.domainReady
        ? "A primary public domain is connected."
        : metrics.homepageApproved
          ? "Connect and verify the domain before launch."
          : "Blocked until the homepage is approved.",
      state: metrics.domainReady
        ? "complete"
        : metrics.homepageApproved
          ? "needs_action"
          : "blocked",
      action: metrics.domainReady
        ? undefined
        : { label: "Open domains", to: "/admin/site-settings" },
    },
    {
      key: "homepage",
      label: "Homepage approved",
      helper: metrics.homepageApproved
        ? "The homepage has published content and is ready for review."
        : metrics.hasTemplate
          ? "Publish the homepage once its draft is approved."
          : "Blocked until a template is assigned.",
      state: metrics.homepageApproved
        ? "complete"
        : metrics.hasTemplate
          ? "needs_action"
          : "blocked",
      action: metrics.homepageApproved
        ? undefined
        : { label: "Publish homepage", to: "/admin/pages/home" },
    },
  ];
}

export function getCompletedSetupCount(site: SiteLike) {
  return getSetupChecklist(site).filter((item) => item.state === "complete").length;
}

export function getSetupProgressPercent(site: SiteLike) {
  return Math.round((getCompletedSetupCount(site) / getSetupChecklist(site).length) * 100);
}

export function getSiteBlockedCount(site: SiteLike) {
  return getSetupChecklist(site).filter((item) => item.state === "blocked").length;
}

export function getSiteNeedsActionCount(site: SiteLike) {
  return getSetupChecklist(site).filter((item) => item.state !== "complete").length;
}

export function getTenantSiteStats(sites: AdminSite[]): TenantSiteStats {
  const total = sites.length;
  const active = sites.filter((site) => site.status === "ACTIVE").length;
  const blocked = sites.filter((site) => getSiteBlockedCount(site) > 0).length;
  const progressTotal = sites.reduce(
    (sum, site) => sum + getSetupProgressPercent(site),
    0
  );

  return {
    total,
    active,
    draft: Math.max(total - active, 0),
    blocked,
    averageProgress: total > 0 ? Math.round(progressTotal / total) : 0,
  };
}

export function getCurrentSiteActions(site: SiteLike): SiteActionSet {
  return {
    primary: getRecommendedSiteAction(toActionContext(site)),
    secondary: getSiteSecondaryActions(site?.slug),
  };
}

export function getNextStepLabel(site: SiteLike) {
  return getCurrentSiteActions(site).primary.label;
}

export function getDomainStateLabel(site: SiteLike) {
  const metrics = getSiteMetrics(site);
  if (metrics.domainReady) {
    return "Connected";
  }

  if (!metrics.homepageApproved) {
    return "Blocked";
  }

  return "Needs action";
}
