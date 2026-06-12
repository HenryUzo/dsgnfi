import {
  getRecommendedSiteAction,
  getSiteSecondaryActions,
  type SiteAction,
  type SiteActionContext,
} from "../lib/adminSiteActions";
import { listAdminAuditEntries, type AdminAuditEntry } from "./adminAudit";
import {
  getAdminSite,
  getAdminSites,
  type AdminSite,
  type AdminSiteDetail,
} from "./adminSites";
import {
  getAdminSiteNavigation,
  listAdminDomains,
  listAdminPages,
  listAdminPreviewTokens,
  type AdminPageSummary,
  type NavigationItem,
  type PreviewTokenSummary,
  type SiteDomain,
} from "./siteSettings";

export type DashboardReadinessState =
  | "complete"
  | "needs_action"
  | "blocked"
  | "warning";

export type DashboardReadinessItem = {
  key:
    | "template"
    | "branding"
    | "navigation"
    | "domain"
    | "preview"
    | "pages";
  label: string;
  helper: string;
  state: DashboardReadinessState;
  action?: SiteAction;
};

export type DashboardIssue = {
  id: string;
  title: string;
  helper: string;
  severity: "warning" | "blocked";
  action?: SiteAction;
};

export type DashboardActivity = {
  id: string;
  timestamp: string;
  actor: string | null;
  summary: string;
  to: string;
};

export type DashboardRecentSite = {
  id: string;
  name: string;
  status: string;
  lastEditedAt: string;
  nextActionLabel: string;
};

export type DashboardSummary = {
  currentSite: {
    id: string;
    name: string;
    slug: string;
    status: string;
    statusLabel: "Draft" | "Active" | "Needs Attention";
    templateName: string;
    lastEditedAt: string;
    progressText: string;
    primaryAction: SiteAction;
    secondaryActions: SiteAction[];
  };
  readiness: {
    completedCount: number;
    totalCount: number;
    publishedPagesCount: number;
    draftPagesCount: number;
    items: DashboardReadinessItem[];
  };
  recommendedAction: SiteAction;
  issues: DashboardIssue[];
  recentActivity: DashboardActivity[];
  recentSites: DashboardRecentSite[];
  templateShortcut: {
    title: string;
    helper: string;
    action: SiteAction;
  };
};

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getLastEditedAt(site: Pick<AdminSiteDetail, "updatedAt" | "createdAt">) {
  return site.updatedAt ?? site.createdAt ?? new Date().toISOString();
}

function getVisibleNavigationCount(items: NavigationItem[]) {
  return items.filter((item) => item.visible).length;
}

function getActivePreviewTokens(tokens: PreviewTokenSummary[]) {
  return tokens.filter((token) => {
    if (token.revokedAt) {
      return false;
    }

    return new Date(token.expiresAt).getTime() > Date.now();
  });
}

function getExpiredPreviewTokens(tokens: PreviewTokenSummary[]) {
  return tokens.filter((token) => {
    if (token.revokedAt) {
      return false;
    }

    return new Date(token.expiresAt).getTime() <= Date.now();
  });
}

function getPageRoute(pageKey: unknown) {
  if (typeof pageKey !== "string" || pageKey.length === 0) {
    return "/admin/pages";
  }

  return `/admin/pages/${encodeURIComponent(pageKey)}`;
}

function getActorLabel(entry: AdminAuditEntry) {
  if (!entry.actor?.email) {
    return null;
  }

  return entry.actor.email.split("@")[0] ?? entry.actor.email;
}

function buildActionContext(
  site: AdminSiteDetail,
  pages: AdminPageSummary[],
  navigation: { primary: NavigationItem[]; footer: NavigationItem[] },
  previewTokens: PreviewTokenSummary[],
  domains: SiteDomain[]
): SiteActionContext {
  const publishedPagesCount = pages.filter((page) => page.status === "PUBLISHED").length;
  const draftPagesCount = pages.filter((page) => page.status !== "PUBLISHED").length;
  const primaryDomain = domains.find((domain) => domain.isPrimary) ?? null;
  const domainConnected = Boolean(
    primaryDomain &&
      (primaryDomain.type === "SUBDOMAIN" || primaryDomain.verificationStatus === "VERIFIED")
  );

  return {
    hasSite: true,
    siteSlug: site.slug,
    templateAssigned: Boolean(site.template),
    brandingComplete: Boolean(site.statusSummary?.brandingReady),
    navigationComplete:
      getVisibleNavigationCount(navigation.primary) > 0 ||
      Boolean(site.statusSummary?.navigationReady),
    domainConnected,
    previewGenerated: getActivePreviewTokens(previewTokens).length > 0,
    publishedPagesCount,
    draftPagesCount,
  };
}

function buildReadinessItems(
  site: AdminSiteDetail,
  pages: AdminPageSummary[],
  navigation: { primary: NavigationItem[]; footer: NavigationItem[] },
  domains: SiteDomain[],
  previewTokens: PreviewTokenSummary[]
): DashboardReadinessItem[] {
  const hasTemplate = Boolean(site.template);
  const brandingComplete = Boolean(site.statusSummary?.brandingReady);
  const visiblePrimaryCount = getVisibleNavigationCount(navigation.primary);
  const publishedPagesCount = pages.filter((page) => page.status === "PUBLISHED").length;
  const draftPagesCount = pages.filter((page) => page.status !== "PUBLISHED").length;
  const activePreviewTokens = getActivePreviewTokens(previewTokens);
  const expiredPreviewTokens = getExpiredPreviewTokens(previewTokens);
  const primaryDomain = domains.find((domain) => domain.isPrimary) ?? null;
  const domainConnected = Boolean(
    primaryDomain &&
      (primaryDomain.type === "SUBDOMAIN" || primaryDomain.verificationStatus === "VERIFIED")
  );

  return [
    {
      key: "template",
      label: "Template selected",
      helper: hasTemplate
        ? `${site.template?.name ?? "Template"} applied to this site.`
        : "No template is assigned yet. Choose one to unlock the rest of setup.",
      state: hasTemplate ? "complete" : "needs_action",
      action: hasTemplate
        ? undefined
        : { id: "assign_template", label: "Assign template", to: "/admin/templates" },
    },
    {
      key: "branding",
      label: "Branding configured",
      helper: brandingComplete
        ? "Name, brand presentation, and core contact details are saved."
        : hasTemplate
          ? "Complete the site identity, contact, and SEO fields in site settings."
          : "Blocked until a template is assigned.",
      state: brandingComplete ? "complete" : hasTemplate ? "needs_action" : "blocked",
      action: brandingComplete
        ? undefined
        : {
            id: "complete_branding",
            label: "Complete branding",
            to: "/admin/site-settings",
          },
    },
    {
      key: "navigation",
      label: "Navigation configured",
      helper:
        visiblePrimaryCount > 0
          ? `${countLabel(visiblePrimaryCount, "primary link")} visible in navigation.`
          : hasTemplate
            ? "No visible primary navigation links are configured yet."
            : "Blocked until a template is assigned.",
      state:
        visiblePrimaryCount > 0 ? "complete" : hasTemplate ? "needs_action" : "blocked",
      action:
        visiblePrimaryCount > 0
          ? undefined
          : {
              id: "complete_navigation",
              label: "Complete navigation",
              to: "/admin/site-settings",
            },
    },
    {
      key: "domain",
      label: "Domain connected",
      helper: domainConnected
        ? `Primary domain ${primaryDomain?.hostname ?? "connected"} is ready for visitors.`
        : primaryDomain
          ? `Primary domain ${primaryDomain.hostname} still needs verification.`
          : "No primary domain is connected yet.",
      state: domainConnected
        ? "complete"
        : primaryDomain
          ? "warning"
          : "needs_action",
      action: domainConnected
        ? undefined
        : { id: "connect_domain", label: "Connect domain", to: "/admin/site-settings" },
    },
    {
      key: "preview",
      label: "Preview generated",
      helper:
        activePreviewTokens.length > 0
          ? `Latest preview link is active until ${new Date(
              activePreviewTokens[0]!.expiresAt
            ).toLocaleString()}.`
          : expiredPreviewTokens.length > 0
            ? "Previous preview links expired. Generate a fresh review link."
            : "No preview link exists yet for reviewers.",
      state:
        activePreviewTokens.length > 0
          ? "complete"
          : expiredPreviewTokens.length > 0
            ? "warning"
            : "needs_action",
      action:
        activePreviewTokens.length > 0
          ? undefined
          : { id: "generate_preview", label: "Generate preview", to: "/admin/site-settings" },
    },
    {
      key: "pages",
      label: "Pages published",
      helper:
        publishedPagesCount > 0 && draftPagesCount === 0
          ? `All ${countLabel(publishedPagesCount, "page")} are published.`
          : publishedPagesCount > 0
            ? `${countLabel(publishedPagesCount, "page")} published, ${countLabel(
                draftPagesCount,
                "draft"
              )} pending review.`
            : draftPagesCount > 0
              ? `No pages are live yet. ${countLabel(draftPagesCount, "draft")} still need review.`
              : "No site pages are available yet.",
      state:
        publishedPagesCount > 0 && draftPagesCount === 0
          ? "complete"
          : publishedPagesCount > 0
            ? "warning"
            : hasTemplate
              ? "needs_action"
              : "blocked",
      action:
        publishedPagesCount > 0 && draftPagesCount === 0
          ? undefined
          : { id: "review_publish", label: "Review and publish", to: "/admin/pages" },
    },
  ];
}

function buildIssues(
  site: AdminSiteDetail,
  pages: AdminPageSummary[],
  domains: SiteDomain[],
  previewTokens: PreviewTokenSummary[]
): DashboardIssue[] {
  const issues: DashboardIssue[] = [];
  const publishedPagesCount = pages.filter((page) => page.status === "PUBLISHED").length;
  const draftPagesCount = pages.filter((page) => page.status !== "PUBLISHED").length;
  const activePreviewTokens = getActivePreviewTokens(previewTokens);
  const expiredPreviewTokens = getExpiredPreviewTokens(previewTokens);
  const primaryDomain = domains.find((domain) => domain.isPrimary) ?? null;
  const domainConnected = Boolean(
    primaryDomain &&
      (primaryDomain.type === "SUBDOMAIN" || primaryDomain.verificationStatus === "VERIFIED")
  );

  if (!site.template) {
    issues.push({
      id: "missing-template",
      title: "No template assigned",
      helper: "Assign a template before branding and content work can move forward.",
      severity: "blocked",
      action: { id: "assign_template", label: "Assign template", to: "/admin/templates" },
    });
  }

  if (!domainConnected) {
    issues.push({
      id: "missing-domain",
      title: "No primary domain connected",
      helper: primaryDomain
        ? `${primaryDomain.hostname} is selected but still needs verification.`
        : "Add or verify a primary domain before launch.",
      severity: primaryDomain ? "warning" : "blocked",
      action: { id: "connect_domain", label: "Connect domain", to: "/admin/site-settings" },
    });
  }

  if (draftPagesCount > 0) {
    issues.push({
      id: "draft-pages",
      title: `${countLabel(draftPagesCount, "page")} still in draft`,
      helper:
        publishedPagesCount > 0
          ? `${countLabel(publishedPagesCount, "page")} already live, but draft work is still pending review.`
          : "No pages are published yet for this site.",
      severity: publishedPagesCount > 0 ? "warning" : "blocked",
      action: { id: "review_publish", label: "Review and publish", to: "/admin/pages" },
    });
  }

  if (activePreviewTokens.length === 0 && expiredPreviewTokens.length > 0) {
    issues.push({
      id: "expired-preview",
      title: "Preview link expired",
      helper: "Reviewers no longer have a live preview link for draft content.",
      severity: "warning",
      action: { id: "generate_preview", label: "Generate preview", to: "/admin/site-settings" },
    });
  }

  if (!site.settings?.contactEmail) {
    issues.push({
      id: "missing-contact-email",
      title: "Contact email missing",
      helper: "Add a public contact email so the site can route inbound enquiries.",
      severity: "warning",
      action: {
        id: "complete_branding",
        label: "Complete branding",
        to: "/admin/site-settings",
      },
    });
  }

  if (!site.settings?.seoTitle) {
    issues.push({
      id: "missing-seo-title",
      title: "Homepage SEO title missing",
      helper: "Set the default SEO title so search and preview metadata are complete.",
      severity: "warning",
      action: {
        id: "complete_branding",
        label: "Complete branding",
        to: "/admin/site-settings",
      },
    });
  }

  return issues;
}

function buildActivitySummary(entry: AdminAuditEntry): DashboardActivity | null {
  const metadata = entry.metadata ?? {};
  const hostname = typeof metadata.hostname === "string" ? metadata.hostname : null;
  const pageKey = typeof metadata.pageKey === "string" ? metadata.pageKey : null;
  const result = typeof metadata.result === "string" ? metadata.result : null;

  switch (entry.action) {
    case "site_settings.updated":
      return {
        id: entry.id,
        timestamp: entry.createdAt,
        actor: getActorLabel(entry),
        summary: "Branding updated",
        to: "/admin/site-settings",
      };
    case "site_navigation.updated":
      return {
        id: entry.id,
        timestamp: entry.createdAt,
        actor: getActorLabel(entry),
        summary: "Navigation updated",
        to: "/admin/site-settings",
      };
    case "page.created":
      return {
        id: entry.id,
        timestamp: entry.createdAt,
        actor: getActorLabel(entry),
        summary: pageKey ? `${pageKey} page created` : "Page created",
        to: getPageRoute(pageKey),
      };
    case "page.published":
      return {
        id: entry.id,
        timestamp: entry.createdAt,
        actor: getActorLabel(entry),
        summary: pageKey ? `${pageKey} published` : "Page published",
        to: getPageRoute(pageKey),
      };
    case "domain.created":
      return {
        id: entry.id,
        timestamp: entry.createdAt,
        actor: getActorLabel(entry),
        summary: hostname ? `Domain added: ${hostname}` : "Domain added",
        to: "/admin/site-settings",
      };
    case "domain.verification_attempted":
      return {
        id: entry.id,
        timestamp: entry.createdAt,
        actor: getActorLabel(entry),
        summary:
          result === "verified"
            ? hostname
              ? `Domain verified: ${hostname}`
              : "Domain verified"
            : hostname
              ? `Domain check failed: ${hostname}`
              : "Domain verification failed",
        to: "/admin/site-settings",
      };
    case "domain.primary_set":
      return {
        id: entry.id,
        timestamp: entry.createdAt,
        actor: getActorLabel(entry),
        summary: hostname ? `Primary domain set: ${hostname}` : "Primary domain updated",
        to: "/admin/site-settings",
      };
    case "preview_token.created":
      return {
        id: entry.id,
        timestamp: entry.createdAt,
        actor: getActorLabel(entry),
        summary: "Preview generated",
        to: "/admin/site-settings",
      };
    case "preview_token.revoked":
      return {
        id: entry.id,
        timestamp: entry.createdAt,
        actor: getActorLabel(entry),
        summary: "Preview revoked",
        to: "/admin/site-settings",
      };
    default:
      return null;
  }
}

function buildRecentActivity(
  site: AdminSiteDetail,
  entries: AdminAuditEntry[]
): DashboardActivity[] {
  const mapped = entries
    .map(buildActivitySummary)
    .filter((entry): entry is DashboardActivity => Boolean(entry))
    .slice(0, 6);

  if (mapped.length > 0) {
    return mapped;
  }

  return [
    {
      id: "site-created",
      timestamp: site.createdAt ?? new Date().toISOString(),
      actor: null,
      summary: "Site created",
      to: "/admin/sites",
    },
  ];
}

function buildRecentSites(sites: AdminSite[], currentSiteId: string) {
  return [...sites]
    .filter((site) => site.id !== currentSiteId)
    .sort((left, right) => {
      return (
        new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() -
        new Date(left.updatedAt ?? left.createdAt ?? 0).getTime()
      );
    })
    .slice(0, 5)
    .map((site) => ({
      id: site.id,
      name: site.name,
      status: site.status,
      lastEditedAt: site.updatedAt ?? site.createdAt ?? new Date().toISOString(),
      nextActionLabel: getRecommendedSiteAction({
        hasSite: true,
        siteSlug: site.slug,
        templateAssigned: Boolean(site.template),
        brandingComplete: Boolean(site.statusSummary?.brandingReady),
        navigationComplete: Boolean(site.statusSummary?.navigationReady),
        domainConnected: Boolean(site.statusSummary?.domainReady),
        previewGenerated: Boolean(site.statusSummary?.previewReady),
        publishedPagesCount: site.statusSummary?.publishedPagesCount ?? 0,
      }).label,
    }));
}

export async function getAdminDashboardSummary(currentSiteId: string) {
  const [currentSite, sites, pages, navigation, domains, previewTokens, auditEntries] =
    await Promise.all([
      getAdminSite(currentSiteId),
      getAdminSites(),
      listAdminPages(),
      getAdminSiteNavigation(),
      listAdminDomains(),
      listAdminPreviewTokens(),
      listAdminAuditEntries({ limit: 8 }),
    ]);

  const actionContext = buildActionContext(
    currentSite,
    pages,
    navigation,
    previewTokens,
    domains
  );
  const recommendedAction = getRecommendedSiteAction(actionContext);
  const readinessItems = buildReadinessItems(
    currentSite,
    pages,
    navigation,
    domains,
    previewTokens
  );
  const completedCount = readinessItems.filter((item) => item.state === "complete").length;
  const totalCount = readinessItems.length;
  const draftPagesCount = pages.filter((page) => page.status !== "PUBLISHED").length;
  const issues = buildIssues(currentSite, pages, domains, previewTokens);

  return {
    currentSite: {
      id: currentSite.id,
      name: currentSite.name,
      slug: currentSite.slug,
      status: currentSite.status,
      statusLabel:
        issues.length > 0 && currentSite.status === "ACTIVE"
          ? "Needs Attention"
          : currentSite.status === "ACTIVE"
            ? "Active"
            : "Draft",
      templateName: currentSite.template?.name ?? "No template assigned",
      lastEditedAt: getLastEditedAt(currentSite),
      progressText: `${completedCount} of ${totalCount} setup steps complete`,
      primaryAction: recommendedAction,
      secondaryActions: getSiteSecondaryActions(currentSite.slug).slice(0, 2),
    },
    readiness: {
      completedCount,
      totalCount,
      publishedPagesCount: pages.filter((page) => page.status === "PUBLISHED").length,
      draftPagesCount,
      items: readinessItems,
    },
    recommendedAction,
    issues,
    recentActivity: buildRecentActivity(currentSite, auditEntries),
    recentSites: buildRecentSites(sites, currentSite.id),
    templateShortcut: currentSite.template
      ? {
          title: currentSite.template.name,
          helper: "Current starter foundation for this site. Compare or reassign from the template library.",
          action: {
            id: "open_template_library",
            label: "Open template library",
            to: "/admin/templates",
          },
        }
      : {
          title: "No template assigned",
          helper: "Assign a starter or custom template to unlock the site setup flow.",
          action: {
            id: "assign_template",
            label: "Assign template",
            to: "/admin/templates",
          },
        },
  } satisfies DashboardSummary;
}
