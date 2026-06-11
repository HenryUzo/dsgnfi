import type {
  AdminSite,
  TemplateCategory,
  TemplateDetail,
  TemplateSummary,
  TemplateUsageSite,
} from "../../../services/adminSites";

export const templateCategories: Array<"all" | TemplateCategory> = [
  "all",
  "agency",
  "healthcare",
  "education",
  "food",
  "property",
  "logistics",
];

export type TemplateTypeFilter = "all" | "starter" | "custom";

export function getTemplateType(template: Pick<TemplateSummary, "sourceType">) {
  return template.sourceType === "CUSTOM" ? "Custom" : "Starter";
}

export function getTemplateTypeFilter(template: Pick<TemplateSummary, "sourceType">) {
  return template.sourceType === "CUSTOM" ? "custom" : "starter";
}

export function getTemplateVersion(template: TemplateSummary | TemplateDetail | null) {
  return template?.activeVersion?.version ?? "No version";
}

export function getTemplateStatus(template: TemplateSummary | TemplateDetail | null) {
  if (!template) {
    return "Draft";
  }

  if (template.status === "INACTIVE") {
    return "Deprecated";
  }

  return template.activeVersion ? "Published" : "Draft";
}

export function getNavigationLabels(template: TemplateDetail | null) {
  return (
    template?.manifest.starterNavigation?.primary?.map((item) =>
      typeof item === "string" ? item : item.label
    ) ?? []
  );
}

export function getIncludedPages(template: TemplateDetail | null) {
  const explicitPages = template?.manifest.supportedPages?.map((page) => page.title);
  if (explicitPages && explicitPages.length > 0) {
    return explicitPages;
  }

  const pages = ["Home", "Contact"];
  if (template?.manifest.starterContentHints?.workEnabled) {
    pages.push("Work");
  }
  if (template?.manifest.starterContentHints?.processEnabled) {
    pages.push("Process");
  }

  return pages;
}

export function getTemplateModules(template: TemplateSummary | TemplateDetail | null) {
  const hints = template?.manifest?.starterContentHints;
  const starterSiteSettings =
    template?.manifest && "starterSiteSettings" in template.manifest
      ? template.manifest.starterSiteSettings
      : null;
  const modules = ["Pages", "Navigation", "Theme", "SEO"];

  if (hints?.workEnabled) {
    modules.push("Work");
  }
  if (hints?.processEnabled) {
    modules.push("Process");
  }
  if (starterSiteSettings?.contactEmail) {
    modules.push("Contact");
  }

  return modules;
}

export function getEditableGroups(template: TemplateDetail | null) {
  return template?.manifest.editableFieldGroups ?? [];
}

export function getCurrentSiteTemplate(sites: AdminSite[], currentSiteId?: string | null) {
  return sites.find((site) => site.id === currentSiteId)?.template ?? null;
}

export function getMostUsedTemplate(templates: TemplateSummary[]) {
  return [...templates].sort((left, right) => {
    return (right.usageCount ?? 0) - (left.usageCount ?? 0);
  })[0] ?? null;
}

export function getTemplateStats(
  templates: TemplateSummary[],
  sites: AdminSite[],
  currentSiteId?: string | null
) {
  const starterTemplates = templates.filter((template) => template.sourceType !== "CUSTOM");
  const customTemplates = templates.filter((template) => template.sourceType === "CUSTOM");
  const inUse = templates.filter((template) => (template.usageCount ?? 0) > 0);
  const currentSiteTemplate = getCurrentSiteTemplate(sites, currentSiteId);

  return {
    starterTemplatesCount: starterTemplates.length,
    customTemplatesCount: customTemplates.length,
    templatesInUseCount: inUse.length,
    currentSiteTemplate: currentSiteTemplate?.name ?? "No template",
    mostUsedTemplate: getMostUsedTemplate(templates)?.name ?? "No usage yet",
  };
}

export function getDriftState(usage: Pick<TemplateUsageSite, "hasTemplateDrift">) {
  return usage.hasTemplateDrift ? "Slightly changed" : "Synced";
}

export function formatTemplateCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}
