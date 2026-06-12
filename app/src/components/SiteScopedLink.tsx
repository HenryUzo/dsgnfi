import type { AnchorHTMLAttributes } from "react";
import { Link as RouterLink, type LinkProps, useLocation } from "react-router-dom";

import { buildSiteScopedPath, getSiteOverrideFromSearch } from "../lib/siteOverride";
import { buildPageLinkWithContext } from "../lib/pageFlow";
import { useOptionalPublicSite } from "../site/PublicSiteContext";

function isExternalTarget(value: string) {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value) || /^(mailto:|tel:)/i.test(value);
}

type SiteScopedLinkProps = LinkProps & AnchorHTMLAttributes<HTMLAnchorElement>;

export function SiteScopedLink({ to, ...props }: SiteScopedLinkProps) {
  const location = useLocation();
  const publicSite = useOptionalPublicSite();
  const siteOverride = getSiteOverrideFromSearch(location.search);
  const target = typeof to === "string" ? to : null;

  if (target && isExternalTarget(target)) {
    const { rel, target: anchorTarget, state: _state, ...anchorProps } = props;
    return (
      <a
        href={target}
        target={anchorTarget ?? "_blank"}
        rel={rel ?? "noreferrer"}
        {...anchorProps}
      />
    );
  }

  const currentPage =
    target && target.startsWith("/") && publicSite?.presentation
      ? publicSite.presentation.pages.find((page) => page.slug === location.pathname) ?? null
      : null;

  const resolvedTarget =
    target && target.startsWith("/") && publicSite?.presentation
      ? buildPageLinkWithContext({
          path: target,
          siteSlug: siteOverride,
          currentPage,
          pages: publicSite.presentation.pages,
          currentSearch: location.search,
        })
      : target
        ? buildSiteScopedPath(target, siteOverride)
        : to;

  const state =
    target && target.startsWith("/")
      ? {
          ...(typeof props.state === "object" && props.state ? props.state : {}),
          fromPath: `${location.pathname}${location.search}${location.hash}`,
        }
      : props.state;

  return (
    <RouterLink
      {...props}
      to={resolvedTarget ?? to}
      state={state}
    />
  );
}
