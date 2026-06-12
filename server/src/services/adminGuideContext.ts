import type { AdminAiContext, AdminAiGuideLink } from "./adminAi";

export type AdminGuideIntentId =
  | "publish_page"
  | "edit_navigation"
  | "manage_domains"
  | "manage_templates"
  | "switch_site"
  | "create_site"
  | "edit_page_content"
  | "manage_work"
  | "manage_process"
  | "change_branding"
  | "general";

export type AdminGuideIntent = {
  id: AdminGuideIntentId;
  label: string;
  primaryLink: AdminAiGuideLink;
  links: AdminAiGuideLink[];
  routeHints: string[];
  matchedKeywords: string[];
};

export type AdminGuideRoute = {
  href: string;
  label: string;
  screen: string;
  hints: string[];
};

export type AdminGuideMetadata = {
  routes: AdminGuideRoute[];
  pageEditor: {
    pageKey?: string | null;
    title?: string | null;
    slug?: string | null;
    templateKey?: string | null;
    allowedBlockTypes: string[];
    currentBlockTypes: string[];
  } | null;
  availableTemplates: string[];
  siteSettingsSections: string[];
  enabledModules: string[];
};

const adminRoutes: AdminGuideRoute[] = [
  {
    href: "/admin",
    label: "Dashboard",
    screen: "Dashboard",
    hints: ["Review site status, recent activity, and shortcuts into setup work."],
  },
  {
    href: "/admin/sites",
    label: "Sites",
    screen: "Sites",
    hints: ["Switch the active site, create a new site, or review site status."],
  },
  {
    href: "/admin/templates",
    label: "Templates",
    screen: "Templates",
    hints: ["Import starter templates and inspect template structure."],
  },
  {
    href: "/admin/pages",
    label: "Pages",
    screen: "Pages",
    hints: ["Open page editors, manage drafts, and publish pages."],
  },
  {
    href: "/admin/site-settings",
    label: "Site Settings",
    screen: "Site Settings",
    hints: ["Edit navigation, branding, SEO, contact details, and domains."],
  },
  {
    href: "/admin/work",
    label: "Work",
    screen: "Work",
    hints: ["Manage projects and case-study style work entries."],
  },
  {
    href: "/admin/process",
    label: "Process",
    screen: "Process",
    hints: ["Manage process, capability, or service sections."],
  },
];

const defaultBlockTypes = [
  "hero",
  "richText",
  "gallery",
  "image",
  "featureGrid",
  "testimonial",
  "contact",
  "workIndex",
  "processIndex",
];

function latestUserText(messages: { role: "user" | "assistant"; content: string }[]) {
  return [...messages]
    .reverse()
    .find((message) => message.role === "user")
    ?.content.toLowerCase() ?? "";
}

function currentPageEditorHref(context: AdminAiContext) {
  return context.route.startsWith("/admin/pages/") ? context.route : "/admin/pages";
}

function link(label: string, href: string): AdminAiGuideLink {
  return { label, href };
}

function makeIntent(options: {
  id: AdminGuideIntentId;
  label: string;
  primaryLink: AdminAiGuideLink;
  routeHints: string[];
  matchedKeywords: string[];
  extraLinks?: AdminAiGuideLink[];
}): AdminGuideIntent {
  const links = [options.primaryLink, ...(options.extraLinks ?? [])];
  const seen = new Set<string>();

  return {
    id: options.id,
    label: options.label,
    primaryLink: options.primaryLink,
    links: links.filter((candidate) => {
      if (seen.has(candidate.href)) {
        return false;
      }
      seen.add(candidate.href);
      return true;
    }),
    routeHints: options.routeHints,
    matchedKeywords: options.matchedKeywords,
  };
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function resolveAdminGuideIntent(
  messages: { role: "user" | "assistant"; content: string }[],
  context: AdminAiContext
): AdminGuideIntent {
  const text = latestUserText(messages);

  if (hasAny(text, ["publish", "published", "draft", "go live", "live page"])) {
    const href = currentPageEditorHref(context);
    return makeIntent({
      id: "publish_page",
      label: "Publish a page",
      primaryLink: link(href === "/admin/pages" ? "Open Pages" : "Open page editor", href),
      extraLinks: [link("Pages", "/admin/pages")],
      routeHints: [
        "Publishing happens from the page editor or the Pages list after saving draft changes.",
        "The assistant can explain the publishing flow but cannot publish the page for the user.",
      ],
      matchedKeywords: ["publish", "draft", "go live"],
    });
  }

  if (hasAny(text, ["navigation", "menu", "header", "footer", "nav item", "link"])) {
    return makeIntent({
      id: "edit_navigation",
      label: "Edit navigation",
      primaryLink: link("Open Site Settings", "/admin/site-settings"),
      routeHints: [
        "Navigation is configured in Site Settings, where menu labels and destinations are managed.",
      ],
      matchedKeywords: ["navigation", "menu", "header", "footer"],
    });
  }

  if (hasAny(text, ["domain", "url", "dns", "subdomain", "custom domain"])) {
    return makeIntent({
      id: "manage_domains",
      label: "Manage domains",
      primaryLink: link("Open Site Settings", "/admin/site-settings"),
      routeHints: ["Domain and public URL settings belong in Site Settings for the active site."],
      matchedKeywords: ["domain", "url", "dns"],
    });
  }

  if (hasAny(text, ["template", "import", "starter", "preset"])) {
    return makeIntent({
      id: "manage_templates",
      label: "Import a template",
      primaryLink: link("Open Templates", "/admin/templates"),
      routeHints: ["Template import and template previews are managed from the Templates screen."],
      matchedKeywords: ["template", "import", "starter"],
    });
  }

  if (hasAny(text, ["create site", "new site", "add site"])) {
    return makeIntent({
      id: "create_site",
      label: "Create a site",
      primaryLink: link("Open Sites", "/admin/sites"),
      routeHints: ["Site creation and site switching are managed from the Sites screen."],
      matchedKeywords: ["create site", "new site", "add site"],
    });
  }

  if (hasAny(text, ["switch site", "active site", "current site", "change site"])) {
    return makeIntent({
      id: "switch_site",
      label: "Switch site",
      primaryLink: link("Open Sites", "/admin/sites"),
      routeHints: ["Use Sites to choose which site the admin is currently editing."],
      matchedKeywords: ["switch site", "active site", "current site"],
    });
  }

  if (hasAny(text, ["work", "project", "case study", "case-study", "portfolio"])) {
    return makeIntent({
      id: "manage_work",
      label: "Manage work",
      primaryLink: link("Open Work", "/admin/work"),
      routeHints: ["Project and work entries are managed in the Work module."],
      matchedKeywords: ["work", "project", "case study"],
    });
  }

  if (hasAny(text, ["process", "service", "capability", "capabilities"])) {
    return makeIntent({
      id: "manage_process",
      label: "Manage process",
      primaryLink: link("Open Process", "/admin/process"),
      routeHints: ["Process and capability entries are managed in the Process module."],
      matchedKeywords: ["process", "service", "capability"],
    });
  }

  if (hasAny(text, ["branding", "brand", "logo", "color", "theme", "seo", "contact"])) {
    return makeIntent({
      id: "change_branding",
      label: "Change branding",
      primaryLink: link("Open Site Settings", "/admin/site-settings"),
      routeHints: ["Branding, contact, SEO, and theme-level settings are edited in Site Settings."],
      matchedKeywords: ["branding", "logo", "color", "theme"],
    });
  }

  if (hasAny(text, ["edit page", "page content", "block", "section", "copy", "content"])) {
    const href = currentPageEditorHref(context);
    return makeIntent({
      id: "edit_page_content",
      label: "Edit page content",
      primaryLink: link(href === "/admin/pages" ? "Open Pages" : "Open page editor", href),
      extraLinks: [link("Pages", "/admin/pages")],
      routeHints: [
        "Page content is edited from the page editor, where blocks and draft fields can be changed.",
      ],
      matchedKeywords: ["edit page", "page content", "block", "section"],
    });
  }

  const fallbackHref = context.route.startsWith("/admin") ? context.route : "/admin";
  return makeIntent({
    id: "general",
    label: "General admin help",
    primaryLink: link("Open current screen", fallbackHref),
    routeHints: ["Use the current admin screen unless the guidance points to a more specific module."],
    matchedKeywords: [],
  });
}

export function buildAdminGuideMetadata(context: AdminAiContext): AdminGuideMetadata {
  const pageEditor = context.pageEditor
    ? {
        pageKey: context.pageEditor.pageKey ?? null,
        title: context.pageEditor.title ?? null,
        slug: context.pageEditor.slug ?? null,
        templateKey: context.pageEditor.pageTemplateKey ?? null,
        allowedBlockTypes: context.pageEditor.allowedBlockTypes ?? [],
        currentBlockTypes: context.pageEditor.blockTypes ?? [],
      }
    : null;

  return {
    routes: adminRoutes,
    pageEditor,
    availableTemplates: ["blit", "starter", "clinic", "portfolio", "standard-page"],
    siteSettingsSections: ["branding", "navigation", "seo", "contact", "domains"],
    enabledModules: ["dashboard", "sites", "templates", "pages", "site-settings", "work", "process", "assets", "domains"],
  };
}

export function getAvailableBlockTypes(metadata: AdminGuideMetadata) {
  const editorTypes = metadata.pageEditor?.allowedBlockTypes ?? [];
  return Array.from(new Set([...editorTypes, ...defaultBlockTypes]));
}
