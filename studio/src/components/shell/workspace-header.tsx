"use client";

import type { Route } from "next";
import { Bell, ChevronRight, Command, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/shell/user-menu";

const titles: Record<string, { label: string; kicker: string }> = {
  "/dashboard": { label: "Agency Dashboard", kicker: "Operations" },
  "/clients": { label: "Clients", kicker: "Brand Memory" },
  "/campaigns": { label: "Campaigns", kicker: "Planning" },
  "/content-calendar": { label: "Content Calendar", kicker: "Execution Queue" },
  "/assets": { label: "Asset Library", kicker: "References" },
  "/settings": { label: "Settings", kicker: "Controls" },
};

type WorkspaceHeaderProps = {
  userEmail: string | null;
  userRole?: string | null;
};

function getBreadcrumbs(pathname: string) {
  if (pathname === "/dashboard") {
    return [{ href: "/dashboard" as Route, label: "Dashboard" }];
  }

  const breadcrumbs: Array<{ href: Route; label: string }> = [];
  const topLevel = Object.entries(titles).find(
    ([key]) => pathname === key || pathname.startsWith(`${key}/`),
  );

  if (topLevel) {
    breadcrumbs.push({
      href: topLevel[0] as Route,
      label: topLevel[1].label,
    });
  }

  if (pathname.endsWith("/new")) {
    breadcrumbs.push({ href: pathname as Route, label: "Create" });
  } else if (pathname.endsWith("/edit")) {
    breadcrumbs.push({ href: pathname as Route, label: "Edit" });
  } else if ((pathname.match(/\//g) ?? []).length > 1) {
    breadcrumbs.push({ href: pathname as Route, label: "Detail" });
  }

  return breadcrumbs;
}

export function WorkspaceHeader({ userEmail, userRole }: WorkspaceHeaderProps) {
  const pathname = usePathname();
  const content =
    Object.entries(titles).find(
      ([key]) => pathname === key || pathname.startsWith(`${key}/`),
    )?.[1] ?? titles["/dashboard"];
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(7,10,18,0.78)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-5 py-4 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.href} className="flex items-center gap-2">
                  {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
                  <Link href={crumb.href} className="transition hover:text-foreground">
                    {crumb.label}
                  </Link>
                </span>
              ))}
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              {content.kicker}
            </p>
            <h2 className="text-xl font-semibold text-foreground">{content.label}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative hidden min-w-[240px] flex-1 lg:block lg:w-[320px] lg:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search workspace"
                placeholder="Search clients, campaigns, or content"
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="hidden border-white/10 bg-white/5 md:inline-flex">
              <Command className="h-4 w-4" />
              Command Menu
            </Button>
            <Button variant="ghost" className="border border-transparent">
              <Bell className="h-4 w-4" />
            </Button>
            <UserMenu email={userEmail} role={userRole} />
          </div>
        </div>
      </div>
    </header>
  );
}
