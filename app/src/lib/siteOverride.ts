const LOCAL_URL_BASE = "http://dsgnfi.local";

function toLocalUrl(path: string) {
  return new URL(path, LOCAL_URL_BASE);
}

export function getSiteOverrideFromSearch(search: string) {
  const site = new URLSearchParams(search).get("site")?.trim();
  return site ? site : null;
}

export function buildSiteScopedPath(path: string, siteSlug?: string | null) {
  if (!path.startsWith("/")) {
    return path;
  }

  const normalizedSite = siteSlug?.trim();
  if (!normalizedSite || normalizedSite === "main") {
    return path;
  }

  const url = toLocalUrl(path);
  url.searchParams.set("site", normalizedSite);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function appendSiteOverrideToPublicPath(path: string, search: string) {
  if (!path.startsWith("/public/")) {
    return path;
  }

  const site = getSiteOverrideFromSearch(search);
  if (!site) {
    return path;
  }

  const url = toLocalUrl(path);
  if (url.searchParams.has("site")) {
    return path;
  }

  url.searchParams.set("site", site);
  return `${url.pathname}${url.search}${url.hash}`;
}
