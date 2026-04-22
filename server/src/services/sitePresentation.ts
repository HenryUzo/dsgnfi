import type { Prisma, PrismaClient } from "@prisma/client";

export type SiteNavigationItemInput = {
  id: string;
  label: string;
  pageKey?: string | null;
  href?: string | null;
  visible?: boolean | null;
  order?: number | null;
};

export type StoredNavigationItem = {
  id: string;
  label: string;
  pageKey: string | null;
  href: string | null;
  visible: boolean;
  order: number;
};

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function slugToHref(slug: string) {
  if (slug === "" || slug === "/") {
    return "/";
  }

  const normalized = slug.startsWith("/") ? slug : `/${slug}`;
  return normalized.replace(/\/+/g, "/");
}

export function normalizeNavigationItems(
  items: SiteNavigationItemInput[] | null | undefined
): StoredNavigationItem[] {
  return (items ?? [])
    .map((item, index) => ({
      id: item.id,
      label: item.label,
      pageKey: item.pageKey ?? null,
      href: item.href ?? null,
      visible: item.visible ?? true,
      order: item.order ?? index,
    }))
    .sort((a, b) => a.order - b.order);
}

export async function validateNavigationItems(
  prisma: PrismaClient,
  options: {
    siteId: string;
    items: SiteNavigationItemInput[] | null | undefined;
  }
) {
  const normalized = normalizeNavigationItems(options.items);
  const pageKeys = normalized
    .map((item) => item.pageKey)
    .filter((value): value is string => Boolean(value));

  if (pageKeys.length === 0) {
    return {
      ok: true as const,
      items: normalized,
    };
  }

  const pages = await prisma.page.findMany({
    where: {
      siteId: options.siteId,
      pageKey: { in: pageKeys },
    },
    select: {
      pageKey: true,
      slug: true,
      currentPublishedRevisionId: true,
    },
  });

  const pageMap = new Map(pages.map((page) => [page.pageKey, page]));
  const missingPageKey = pageKeys.find((pageKey) => !pageMap.has(pageKey));

  if (missingPageKey) {
    return {
      ok: false as const,
      message: `Navigation item references an unknown page: ${missingPageKey}.`,
    };
  }

  return {
    ok: true as const,
    items: normalized,
  };
}

export function buildNavigationDefaults(options: {
  starterPrimary?: string[] | null;
  supportedPages?: Array<{ pageKey: string; title: string; slug: string }> | null;
}) {
  const pagesByKey = new Map(
    (options.supportedPages ?? []).map((page) => [page.pageKey, page])
  );
  const pagesByTitle = new Map(
    (options.supportedPages ?? []).map((page) => [page.title.toLowerCase(), page])
  );

  const primary = (options.starterPrimary ?? [])
    .map((label, index) => {
      const normalized = label.trim().toLowerCase();
      const page =
        pagesByKey.get(normalized) ??
        pagesByTitle.get(normalized) ??
        [...pagesByKey.values()].find((entry) => entry.pageKey === normalized);

      return {
        id: `primary-${index + 1}`,
        label,
        pageKey: page?.pageKey ?? null,
        href: page ? slugToHref(page.slug) : `/${normalized.replace(/\s+/g, "-")}`,
        visible: true,
        order: index,
      };
    })
    .filter((item) => item.label.length > 0);

  const footerCandidates = ["home", "about", "work", "process", "contact"];
  const footer = footerCandidates
    .map((pageKey, index) => pagesByKey.get(pageKey))
    .filter((page): page is { pageKey: string; title: string; slug: string } => Boolean(page))
    .map((page, index) => ({
      id: `footer-${index + 1}`,
      label: page.title,
      pageKey: page.pageKey,
      href: slugToHref(page.slug),
      visible: true,
      order: index,
    }));

  return {
    primaryNavigation: toJsonInput(primary),
    footerNavigation: toJsonInput(footer),
  };
}

export async function getSitePresentation(prisma: PrismaClient, siteId: string) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      settings: true,
      pages: {
        select: {
          pageKey: true,
          slug: true,
          currentPublishedRevisionId: true,
        },
      },
    },
  });

  if (!site) {
    return null;
  }

  const pageMap = new Map(
    site.pages.map((page) => [page.pageKey, page])
  );

  const resolveNavigation = (
    source: unknown
  ): Array<{
    id: string;
    label: string;
    pageKey: string | null;
    href: string;
    visible: boolean;
    order: number;
  }> => {
    const items = normalizeNavigationItems(
      Array.isArray(source) ? (source as SiteNavigationItemInput[]) : []
    );

    return items
      .filter((item) => item.visible)
      .map((item) => {
        if (item.pageKey) {
          const page = pageMap.get(item.pageKey);
          if (!page) {
            return null;
          }

          return {
            ...item,
            href: slugToHref(page.slug),
          };
        }

        if (!item.href) {
          return null;
        }

        return {
          ...item,
          href: item.href,
        };
      })
      .filter(
        (
          item
        ): item is {
          id: string;
          label: string;
          pageKey: string | null;
          href: string;
          visible: boolean;
          order: number;
        } => Boolean(item)
      )
      .sort((a, b) => a.order - b.order);
  };

  const settings = site.settings;

  return {
    site: {
      id: site.id,
      name: site.name,
      slug: site.slug,
    },
    settings: {
      siteName: site.name,
      logoUrl: settings?.logoUrl ?? null,
      faviconUrl: settings?.faviconUrl ?? null,
      tagline: settings?.tagline ?? null,
      contactEmail: settings?.contactEmail ?? null,
      contactPhone: settings?.contactPhone ?? null,
      address: settings?.address ?? null,
      socialLinks: (settings?.socialLinks as Record<string, string> | null) ?? {},
      seoTitle: settings?.seoTitle ?? null,
      seoDescription: settings?.seoDescription ?? null,
      locale: settings?.locale ?? null,
      timezone: settings?.timezone ?? null,
    },
    theme: (settings?.theme as Record<string, unknown> | null) ?? {},
    navigation: {
      primary: resolveNavigation(settings?.primaryNavigation),
      footer: resolveNavigation(settings?.footerNavigation),
    },
  };
}

export function toPublicSiteResponse(
  presentation: Awaited<ReturnType<typeof getSitePresentation>>
) {
  if (!presentation) {
    return null;
  }

  return {
    site: presentation.site,
    settings: presentation.settings,
    theme: presentation.theme,
    navigation: presentation.navigation,
  };
}
