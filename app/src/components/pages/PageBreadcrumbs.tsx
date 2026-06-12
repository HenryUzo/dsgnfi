import { ChevronLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { buildBreadcrumbHref, resolveCurrentBreadcrumbTrail } from "../../lib/pageFlow";
import { usePublicSite } from "../../site/PublicSiteContext";
import type { PublicPageDetail } from "../../services/siteSettings";

type BreadcrumbVariant = "default" | "blit";

export function PageBreadcrumbs({
  page,
  variant = "default",
}: {
  page: PublicPageDetail;
  variant?: BreadcrumbVariant;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { presentation } = usePublicSite();

  if (page.hierarchy.role !== "INNER") {
    return null;
  }

  if (!presentation) {
    return null;
  }

  const trail = resolveCurrentBreadcrumbTrail(
    page,
    presentation.pages,
    location.search
  );

  if (trail.length === 0) {
    return null;
  }

  const parentTarget = trail.length > 1 ? trail[trail.length - 2] : null;
  const fromPath =
    typeof location.state === "object" &&
    location.state &&
    "fromPath" in location.state &&
    typeof (location.state as { fromPath?: unknown }).fromPath === "string"
      ? (location.state as { fromPath: string }).fromPath
      : null;

  const handleBack = () => {
    if (fromPath?.startsWith("/")) {
      navigate(-1);
      return;
    }

    if (parentTarget) {
      navigate(
        buildBreadcrumbHref({
          item: parentTarget,
          index: trail.length - 2,
          trail,
          siteSlug: presentation.site.slug,
        })
      );
    }
  };

  const styles =
    variant === "blit"
      ? {
          wrapper: "px-5 pt-28 md:px-8 lg:px-12",
          backButton:
            "inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#15130f]/75 transition hover:border-black/40 hover:text-[#15130f]",
          crumbs: "mt-5 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#15130f]/45",
          link: "transition hover:text-[#15130f]",
          current: "text-[#15130f]/75",
        }
      : {
          wrapper: "px-6 pt-24",
          backButton:
            "inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/75 transition hover:border-white/40 hover:text-white",
          crumbs: "mt-5 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/45",
          link: "transition hover:text-white",
          current: "text-white/70",
        };

  return (
    <div className={styles.wrapper}>
      <button type="button" onClick={handleBack} className={styles.backButton}>
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        {trail.map((item, index) => {
          const isCurrent = index === trail.length - 1;
          return (
            <span key={`${item.pageKey}-${index}`} className="flex items-center gap-2">
              {isCurrent ? (
                <span className={styles.current}>{item.title}</span>
              ) : (
                <Link
                  to={buildBreadcrumbHref({
                    item,
                    index,
                    trail,
                    siteSlug: presentation.site.slug,
                  })}
                  className={styles.link}
                >
                  {item.title}
                </Link>
              )}
              {!isCurrent ? <span aria-hidden="true">/</span> : null}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
