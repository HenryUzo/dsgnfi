import type { PageHierarchyRole, PrismaClient } from "@prisma/client";

import { ApiRequestError } from "./apiErrors";

type HierarchyPage = {
  pageKey: string;
  title: string;
  slug: string;
  hierarchyRole: PageHierarchyRole;
  defaultParentPageKey: string | null;
};

type HierarchyTarget = {
  pageKey: string;
  title: string;
  slug: string;
  hierarchyRole: PageHierarchyRole;
  defaultParentPageKey: string | null;
};

export type HierarchyPayload = {
  role: PageHierarchyRole;
  defaultParentPageKey: string | null;
  defaultParentTitle: string | null;
  defaultParentSlug: string | null;
};

type TrailItem = {
  pageKey: string;
  title: string;
  slug: string;
};

export function toPageHierarchyPayload(
  page: {
    hierarchyRole?: PageHierarchyRole | null;
    defaultParentPageKey?: string | null;
  },
  defaultParent?: Pick<HierarchyPage, "title" | "slug"> | null
): HierarchyPayload {
  return {
    role: page.hierarchyRole ?? "MAIN",
    defaultParentPageKey: page.defaultParentPageKey ?? null,
    defaultParentTitle: defaultParent?.title ?? null,
    defaultParentSlug: defaultParent?.slug ?? null,
  };
}

export async function listSiteHierarchyPages(prisma: PrismaClient, siteId: string) {
  return prisma.page.findMany({
    where: { siteId },
    select: {
      pageKey: true,
      title: true,
      slug: true,
      hierarchyRole: true,
      defaultParentPageKey: true,
    },
  });
}

export function assertValidPageHierarchy(options: {
  pages: HierarchyPage[];
  pageKey: string;
  nextRole: PageHierarchyRole;
  nextDefaultParentPageKey: string | null;
}) {
  const { pages, pageKey, nextRole, nextDefaultParentPageKey } = options;

  if (nextRole === "MAIN") {
    return;
  }

  if (!nextDefaultParentPageKey) {
    throw new ApiRequestError(
      400,
      "page_hierarchy_parent_required",
      "Inner pages require a default parent page."
    );
  }

  if (nextDefaultParentPageKey === pageKey) {
    throw new ApiRequestError(
      400,
      "page_hierarchy_self_parent",
      "A page cannot use itself as its default parent."
    );
  }

  const pageMap = new Map(
    pages.map((page) => [
      page.pageKey,
      page.pageKey === pageKey
        ? {
            ...page,
            hierarchyRole: nextRole,
            defaultParentPageKey: nextDefaultParentPageKey,
          }
        : page,
    ])
  );

  const defaultParent = pageMap.get(nextDefaultParentPageKey);
  if (!defaultParent) {
    throw new ApiRequestError(
      400,
      "page_hierarchy_parent_not_found",
      "The selected default parent page no longer exists."
    );
  }

  const visited = new Set<string>([pageKey]);
  let current: HierarchyPage | undefined = defaultParent;

  while (current) {
    if (visited.has(current.pageKey)) {
      throw new ApiRequestError(
        400,
        "page_hierarchy_cycle",
        "That parent selection would create a breadcrumb cycle."
      );
    }

    visited.add(current.pageKey);

    if (current.hierarchyRole === "MAIN") {
      return;
    }

    if (!current.defaultParentPageKey) {
      throw new ApiRequestError(
        400,
        "page_hierarchy_missing_main_root",
        "Inner pages must resolve back to a main page."
      );
    }

    current = pageMap.get(current.defaultParentPageKey);
    if (!current) {
      throw new ApiRequestError(
        400,
        "page_hierarchy_parent_not_found",
        "The selected breadcrumb trail is incomplete."
      );
    }
  }
}

export function buildDefaultHierarchyTrail(
  page: {
    pageKey: string;
    title: string;
    slug: string;
    hierarchyRole: PageHierarchyRole;
    defaultParentPageKey: string | null;
  },
  pages: HierarchyTarget[]
) {
  if (page.hierarchyRole !== "INNER") {
    return [] as TrailItem[];
  }

  const pageMap = new Map(pages.map((entry) => [entry.pageKey, entry]));
  const trail: TrailItem[] = [];
  const visited = new Set<string>([page.pageKey]);
  let currentParentKey = page.defaultParentPageKey;

  while (currentParentKey) {
    const parent = pageMap.get(currentParentKey);
    if (!parent || visited.has(parent.pageKey)) {
      break;
    }

    trail.unshift({
      pageKey: parent.pageKey,
      title: parent.title,
      slug: parent.slug,
    });
    visited.add(parent.pageKey);
    currentParentKey = parent.defaultParentPageKey;
  }

  return trail;
}
