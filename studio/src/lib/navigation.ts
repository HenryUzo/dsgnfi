export type WorkspaceRoute =
  | "/dashboard"
  | "/clients"
  | "/campaigns"
  | "/content-calendar"
  | "/assets"
  | "/settings";

export type WorkspaceNavItem = {
  href: WorkspaceRoute;
  label: string;
  description: string;
};

export const workspaceNavItems: WorkspaceNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Agency snapshot and priority queue.",
  },
  {
    href: "/clients",
    label: "Clients",
    description: "Brand profiles and client context.",
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    description: "Briefs, timelines, and delivery status.",
  },
  {
    href: "/content-calendar",
    label: "Content Calendar",
    description: "List-first view of upcoming content items.",
  },
  {
    href: "/assets",
    label: "Asset Library",
    description: "Files, references, and source materials.",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Workspace defaults, roles, and AI boundaries.",
  },
];
