import type {
  PageHierarchy,
  PublicPageDetail,
  PublicSitePageSummary,
} from "../services/siteSettings";

const LOCAL_URL_BASE = "http://dsgnfi.local";
const FLOW_QUERY_KEY = "flow";

export type BreadcrumbItem = {
  pageKey: string;
  title: string;
  slug: string;
  hierarchy: PageHierarchy;
};

export type FlowAwareCurrentPage = Pick<
  PublicPageDetail,
  "pageKey" | "title" | "slug" | "hierarchy"
>;

function toLocalUrl(path: string) {
  return new URL(path, LOCAL_URL_BASE);
}

function dedupePageKeys(pageKeys: string[]) {
  const seen = new Set<string>();
  return pageKeys.filter((pageKey) => {
    if (!pageKey || seen.has(pageKey)) {
      return false;
    }

    seen.add(pageKey);
    return true;
  });
}

function toBreadcrumbItem(
  page: Pick<PublicSitePageSummary, "pageKey" | "title" | "slug" | "hierarchy">
): BreadcrumbItem {
  return {
    pageKey: page.pageKey,
    title: page.title,
    slug: page.slug,
    hierarchy: page.hierarchy,
  };
}

function pageMapFrom(pages: PublicSitePageSummary[]) {
  return new Map(pages.map((page) => [page.pageKey, page]));
}

export function parseFlowPageKeys(search: string) {
  const rawValue = new URLSearchParams(search).get(FLOW_QUERY_KEY)?.trim();
  if (!rawValue) {
    return [];
  }

  return dedupePageKeys(rawValue.split(">").map((entry) => entry.trim()).filter(Boolean));
}

export function resolveDefaultBreadcrumbAncestors(
  page: Pick<PublicPageDetail, "pageKey" | "hierarchy">,
  pages: PublicSitePageSummary[]
) {
  if (page.hierarchy.role !== "INNER") {
    return [] as BreadcrumbItem[];
  }

  const pagesByKey = pageMapFrom(pages);
  const ancestors: BreadcrumbItem[] = [];
  const visited = new Set<string>([page.pageKey]);
  let currentParentKey = page.hierarchy.defaultParentPageKey;

  while (currentParentKey) {
    const parent = pagesByKey.get(currentParentKey);
    if (!parent || visited.has(parent.pageKey)) {
      break;
    }

    ancestors.unshift(toBreadcrumbItem(parent));
    visited.add(parent.pageKey);
    currentParentKey = parent.hierarchy.defaultParentPageKey;
  }

  return ancestors;
}

export function resolveCurrentBreadcrumbTrail(
  page: FlowAwareCurrentPage,
  pages: PublicSitePageSummary[],
  search: string
) {
  if (page.hierarchy.role !== "INNER") {
    return [] as BreadcrumbItem[];
  }

  const pagesByKey = pageMapFrom(pages);
  const flowAncestors = parseFlowPageKeys(search)
    .filter((pageKey) => pageKey !== page.pageKey)
    .map((pageKey) => pagesByKey.get(pageKey))
    .filter((entry): entry is PublicSitePageSummary => Boolean(entry))
    .map(toBreadcrumbItem);

  const ancestors =
    flowAncestors.length > 0
      ? flowAncestors
      : resolveDefaultBreadcrumbAncestors(page, pages);

  return [
    ...ancestors,
    {
      pageKey: page.pageKey,
      title: page.title,
      slug: page.slug,
      hierarchy: page.hierarchy,
    },
  ];
}

export function buildPageLinkWithContext(options: {
  path: string;
  siteSlug?: string | null;
  currentPage: FlowAwareCurrentPage | null;
  pages: PublicSitePageSummary[];
  currentSearch: string;
}) {
  const url = toLocalUrl(options.path);
  const normalizedPath = url.pathname;
  const destinationPage = options.pages.find((page) => page.slug === normalizedPath) ?? null;

  if (options.siteSlug && options.siteSlug !== "main" && !url.searchParams.has("site")) {
    url.searchParams.set("site", options.siteSlug);
  }

  if (!destinationPage) {
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (destinationPage.hierarchy.role === "MAIN") {
    url.searchParams.delete(FLOW_QUERY_KEY);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  const currentTrail = options.currentPage
    ? options.currentPage.hierarchy.role === "MAIN"
      ? [toBreadcrumbItem(options.currentPage)]
      : resolveCurrentBreadcrumbTrail(options.currentPage, options.pages, options.currentSearch)
    : [];
  const nextFlowPageKeys = dedupePageKeys(currentTrail.map((entry) => entry.pageKey));

  if (nextFlowPageKeys.length === 0) {
    url.searchParams.delete(FLOW_QUERY_KEY);
  } else {
    url.searchParams.set(FLOW_QUERY_KEY, nextFlowPageKeys.join(">"));
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildBreadcrumbHref(options: {
  item: BreadcrumbItem;
  index: number;
  trail: BreadcrumbItem[];
  siteSlug?: string | null;
}) {
  const url = toLocalUrl(options.item.slug);

  if (options.siteSlug && options.siteSlug !== "main") {
    url.searchParams.set("site", options.siteSlug);
  }

  if (options.item.hierarchy.role === "MAIN") {
    url.searchParams.delete(FLOW_QUERY_KEY);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  const flowPageKeys = dedupePageKeys(
    options.trail.slice(0, options.index).map((entry) => entry.pageKey)
  );

  if (flowPageKeys.length > 0) {
    url.searchParams.set(FLOW_QUERY_KEY, flowPageKeys.join(">"));
  } else {
    url.searchParams.delete(FLOW_QUERY_KEY);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
