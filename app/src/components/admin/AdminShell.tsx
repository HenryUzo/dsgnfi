import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, matchPath, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAdmin } from "../../auth/useAdmin";
import { buildSiteScopedPath } from "../../lib/siteOverride";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { AdminAiContextProvider } from "./AdminAiContext";
import { AdminAssistant } from "./AdminAssistant";
import { SidebarNavSection } from "./SidebarNavSection";

const navGroups = [
  {
    label: "Platform",
    items: [
      { label: "Dashboard", to: "/admin" },
      { label: "Sites", to: "/admin/sites" },
      { label: "Templates", to: "/admin/templates" },
    ],
  },
  {
    label: "Current Site",
    items: [
      { label: "Pages", to: "/admin/pages" },
      { label: "Site Settings", to: "/admin/site-settings" },
    ],
  },
];

const ADMIN_SIDEBAR_STORAGE_KEY = "dsgnfi-admin-sidebar-collapsed";

type AdminShellProps = {
  title: string;
  children: ReactNode;
};

type AdminBreadcrumb = {
  label: string;
  to?: string;
};

function isActivePath(currentPath: string, targetPath: string) {
  if (targetPath === "/admin") {
    return currentPath === "/admin";
  }

  if (targetPath === "/admin/pages") {
    return (
      currentPath === "/admin/pages" ||
      currentPath.startsWith("/admin/pages/") ||
      currentPath === "/admin/work" ||
      currentPath === "/admin/process"
    );
  }

  return currentPath.startsWith(targetPath);
}

function resolveAdminBreadcrumbs(pathname: string, title: string): AdminBreadcrumb[] {
  const matchers: Array<{
    pattern: string;
    build: () => AdminBreadcrumb[];
  }> = [
    {
      pattern: "/admin",
      build: () => [{ label: "Dashboard" }],
    },
    {
      pattern: "/admin/sites",
      build: () => [
        { label: "Dashboard", to: "/admin" },
        { label: "Sites" },
      ],
    },
    {
      pattern: "/admin/templates",
      build: () => [
        { label: "Dashboard", to: "/admin" },
        { label: "Templates" },
      ],
    },
    {
      pattern: "/admin/pages",
      build: () => [
        { label: "Dashboard", to: "/admin" },
        { label: "Pages" },
      ],
    },
    {
      pattern: "/admin/pages/home/legacy",
      build: () => [
        { label: "Dashboard", to: "/admin" },
        { label: "Pages", to: "/admin/pages" },
        { label: "Legacy Home Editor" },
      ],
    },
    {
      pattern: "/admin/pages/home",
      build: () => [
        { label: "Dashboard", to: "/admin" },
        { label: "Pages", to: "/admin/pages" },
        { label: title },
      ],
    },
    {
      pattern: "/admin/pages/generic/:pageKey",
      build: () => [
        { label: "Dashboard", to: "/admin" },
        { label: "Pages", to: "/admin/pages" },
        { label: title },
      ],
    },
    {
      pattern: "/admin/pages/:pageKey",
      build: () => [
        { label: "Dashboard", to: "/admin" },
        { label: "Pages", to: "/admin/pages" },
        { label: title },
      ],
    },
    {
      pattern: "/admin/site-settings",
      build: () => [
        { label: "Dashboard", to: "/admin" },
        { label: "Site Settings" },
      ],
    },
    {
      pattern: "/admin/work",
      build: () => [
        { label: "Dashboard", to: "/admin" },
        { label: "Pages", to: "/admin/pages" },
        { label: title },
      ],
    },
    {
      pattern: "/admin/process",
      build: () => [
        { label: "Dashboard", to: "/admin" },
        { label: "Pages", to: "/admin/pages" },
        { label: title },
      ],
    },
  ];

  for (const matcher of matchers) {
    if (matchPath({ path: matcher.pattern, end: true }, pathname)) {
      return matcher.build();
    }
  }

  return [
    { label: "Dashboard", to: "/admin" },
    { label: title },
  ];
}

export function AdminShell({ title, children }: AdminShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, availableSites, logout, changeSite, switchingSite } = useAdmin();
  const [selectedSiteId, setSelectedSiteId] = useState(admin?.currentSite?.id ?? "");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(ADMIN_SIDEBAR_STORAGE_KEY) === "true";
  });

  const currentSiteId = admin?.currentSite?.id ?? "";
  const publicSiteHref = buildSiteScopedPath("/", admin?.currentSite?.slug);

  useEffect(() => {
    if (currentSiteId) {
      setSelectedSiteId(currentSiteId);
    }
  }, [currentSiteId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      ADMIN_SIDEBAR_STORAGE_KEY,
      sidebarCollapsed ? "true" : "false"
    );
  }, [sidebarCollapsed]);

  const siteOptions = useMemo(
    () => availableSites.map((site) => ({ value: site.id, label: site.name })),
    [availableSites]
  );
  const breadcrumbs = useMemo(
    () => resolveAdminBreadcrumbs(location.pathname, title),
    [location.pathname, title]
  );

  const handleSiteChange = async (nextSiteId: string) => {
    if (!nextSiteId || nextSiteId === currentSiteId) {
      setSelectedSiteId(currentSiteId);
      return;
    }

    setSelectedSiteId(nextSiteId);

    try {
      await changeSite(nextSiteId);
      toast.success("Site context updated.");
      navigate(`${location.pathname}${location.search}`, { replace: true });
    } catch (err) {
      setSelectedSiteId(currentSiteId);
      toast.error(err instanceof Error ? err.message : "Failed to switch site.");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const breadcrumbContent = (
    <Breadcrumb aria-label="Admin breadcrumbs">
      <BreadcrumbList className="gap-2 text-[11px] uppercase tracking-[0.22em] text-white/42">
        {breadcrumbs.flatMap((item, index) => {
          const isCurrent = index === breadcrumbs.length - 1;
          const nodes = [
            <BreadcrumbItem
              key={`item-${item.label}-${index}`}
              className="gap-2 text-inherit"
            >
                {isCurrent ? (
                  <BreadcrumbPage className="text-[11px] uppercase tracking-[0.22em] text-white/72">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    asChild
                    className="text-[11px] uppercase tracking-[0.22em] text-white/50 hover:text-white"
                  >
                    <Link to={item.to ?? "/admin"}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>,
          ];

          if (!isCurrent) {
            nodes.push(
              <BreadcrumbSeparator
                key={`separator-${item.label}-${index}`}
                className="text-white/25"
              />
            );
          }

          return nodes;
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminAiContextProvider>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur lg:hidden">
        <div className="w-full px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.34em] text-white/38">
                Dsgnfi CMS
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-white">{title}</h1>
                {admin?.currentTenant?.name ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/55">
                    Tenant: {admin.currentTenant.name}
                  </span>
                ) : null}
                {admin?.currentRole ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/55">
                    Role: {admin.currentRole}
                  </span>
                ) : null}
              </div>
              <div className="mt-3">{breadcrumbContent}</div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
              <label className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                  Site
                </span>
                <select
                  value={selectedSiteId}
                  onChange={(event) => void handleSiteChange(event.target.value)}
                  disabled={switchingSite || siteOptions.length === 0}
                  className="max-w-[15rem] truncate bg-transparent text-xs uppercase tracking-[0.18em] text-white outline-none"
                >
                  {siteOptions.map((site) => (
                    <option key={site.value} value={site.value} className="bg-black text-white">
                      {site.label}
                    </option>
                  ))}
                </select>
              </label>

              <Link
                to={publicSiteHref}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-white/30 hover:text-white"
              >
                View site
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white hover:border-white"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {navGroups.map((group) => (
              <div
                key={group.label}
                className="flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1.5"
              >
                <span className="shrink-0 px-2 text-[9px] uppercase tracking-[0.22em] text-white/35">
                  {group.label}
                </span>
                <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1 pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {group.items.map((item) => {
                    const active = isActivePath(location.pathname, item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
                          active
                            ? "bg-white text-black"
                            : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {admin?.currentSite?.name ? (
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/55">
                Current site: {admin.currentSite.name}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div
        className={`w-full lg:grid lg:gap-8 lg:px-6 lg:py-6 ${
          sidebarCollapsed
            ? "lg:grid-cols-[176px_minmax(0,1fr)]"
            : "lg:grid-cols-[280px_minmax(0,1fr)]"
        }`}
      >
        <aside className="hidden lg:block">
          <div
            data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
            className={`fixed left-6 top-6 z-30 flex h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur transition-[padding,width] ${
              sidebarCollapsed ? "w-[176px] gap-4 p-4" : "w-[280px] gap-6 p-5"
            }`}
          >
            <div className={sidebarCollapsed ? "space-y-3" : "space-y-4"}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.34em] text-white/38">
                    Dsgnfi CMS
                  </p>
                  {!sidebarCollapsed ? (
                    <h1 className="mt-3 text-2xl font-semibold text-white">{title}</h1>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((current) => !current)}
                  aria-label={sidebarCollapsed ? "Expand side navigation" : "Collapse side navigation"}
                  title={sidebarCollapsed ? "Expand side navigation" : "Collapse side navigation"}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/35 text-white/72 transition hover:border-white/35 hover:text-white"
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              <label className="block space-y-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                  {sidebarCollapsed ? "Site" : "Active site"}
                </span>
                <select
                  value={selectedSiteId}
                  onChange={(event) => void handleSiteChange(event.target.value)}
                  disabled={switchingSite || siteOptions.length === 0}
                  className={`w-full rounded-2xl border border-white/10 bg-black/40 text-white outline-none transition ${
                    sidebarCollapsed ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"
                  }`}
                >
                  {siteOptions.map((site) => (
                    <option key={site.value} value={site.value} className="bg-black text-white">
                      {site.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
              <nav className="space-y-4" aria-label="Admin navigation">
                {navGroups.map((group) => (
                  <SidebarNavSection
                    key={group.label}
                    compact={sidebarCollapsed}
                    label={group.label}
                    items={group.items.map((item) => ({
                      label: item.label,
                      to: item.to,
                      active: isActivePath(location.pathname, item.to),
                    }))}
                  />
                ))}
              </nav>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-5">
              <Link
                to={publicSiteHref}
                className={`flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/75 transition hover:border-white/30 hover:text-white ${
                  sidebarCollapsed ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"
                }`}
              >
                {sidebarCollapsed ? "View site" : "View public site"}
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className={`flex w-full items-center justify-center rounded-2xl border border-white/20 text-white transition hover:border-white ${
                  sidebarCollapsed ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="hidden lg:block">
            <div className="flex w-full items-start justify-between gap-6 px-6 pt-8">
              <div>
                {breadcrumbContent}
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">
                  Admin Workspace
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
              </div>
            </div>
          </div>

          {children}
        </div>
      </div>
      <AdminAssistant title={title} />
      </AdminAiContextProvider>
    </div>
  );
}
