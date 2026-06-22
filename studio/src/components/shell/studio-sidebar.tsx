"use client";

import { Building2, CalendarRange, FolderOpen, LayoutGrid, Menu, Settings2, Sparkles, Users2, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { workspaceNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const iconMap = {
  "/dashboard": LayoutGrid,
  "/clients": Users2,
  "/campaigns": Sparkles,
  "/content-calendar": CalendarRange,
  "/assets": FolderOpen,
  "/settings": Settings2,
};

function SidebarPanel({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(9,13,24,0.98),rgba(7,10,18,0.98))]">
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Dsgnfi AI Studio</p>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Content + Campaign MVP
            </p>
          </div>
        </div>
      </div>
      <Separator className="bg-white/10" />
      <nav className="flex-1 space-y-2 px-3 py-5">
        {workspaceNavItems.map((item) => {
          const Icon = iconMap[item.href as keyof typeof iconMap];
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-start gap-3 rounded-2xl border px-4 py-3 transition",
                isActive
                  ? "border-primary/25 bg-primary/12 text-foreground shadow-[0_0_0_1px_rgba(41,187,160,0.14)]"
                  : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/5 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl",
                  isActive ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="space-y-1">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs leading-5 text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="px-5 pb-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Approval Guardrail</p>
            <Badge variant="success">Manual only</Badge>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Publishing stays human-controlled. This MVP prepares content and approvals but does not push to social channels.
          </p>
        </div>
      </div>
    </div>
  );
}

export function StudioSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="hidden border-r border-white/10 lg:block lg:w-[320px]">
        <SidebarPanel pathname={pathname} />
      </aside>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 lg:hidden">
        <div>
          <p className="text-sm font-semibold text-foreground">Dsgnfi AI Studio</p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Workspace
          </p>
        </div>
        <Button variant="outline" onClick={() => setMobileOpen(true)}>
          <Menu className="h-4 w-4" />
          Navigation
        </Button>
      </div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden">
          <div className="absolute inset-y-0 left-0 w-[88vw] max-w-[340px] border-r border-white/10">
            <div className="flex items-center justify-end px-3 py-3">
              <Button variant="ghost" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarPanel pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
