import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    to: vi.fn(),
  },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {
    refresh: vi.fn(),
    getAll: vi.fn(() => []),
  },
}));

vi.mock("./auth/useAdmin", () => ({
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("./auth/RequireAdmin", () => ({
  RequireAdmin: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("./components/Navigation", () => ({
  Navigation: () => null,
}));

vi.mock("./components/Footer", () => ({
  Footer: () => null,
}));

vi.mock("./components/RotatingCursor", () => ({
  RotatingCursor: () => null,
  CursorFollower: () => null,
}));

vi.mock("./components/admin/AdminShell", () => ({
  AdminShell: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("./site/PublicSiteContext", () => ({
  PublicSiteProvider: ({ children }: { children: React.ReactNode }) => children,
  usePublicSite: () => ({
    presentation: null,
    loading: false,
    error: null,
  }),
}));

vi.mock("./services/siteSettings", () => ({
  getPublicPageBySlug: vi.fn(),
}));

vi.mock("./sections/Hero", () => ({ Hero: () => <div>Hero</div> }));
vi.mock("./sections/Services", () => ({ Services: () => <div>Services</div> }));
vi.mock("./sections/FeaturedWork", () => ({ FeaturedWork: () => <div>Featured Work</div> }));
vi.mock("./sections/Awards", () => ({ Awards: () => <div>Awards</div> }));
vi.mock("./sections/Testimonials", () => ({ Testimonials: () => <div>Testimonials</div> }));
vi.mock("./sections/FAQ", () => ({ FAQ: () => <div>FAQ</div> }));
vi.mock("./sections/CTA", () => ({ CTA: () => <div>CTA</div> }));

vi.mock("./pages/Work", () => ({ Work: () => <div>Work</div> }));
vi.mock("./pages/Project", () => ({ Project: () => <div>Project</div> }));
vi.mock("./pages/Process", () => ({ Process: () => <div>Process</div> }));
vi.mock("./pages/Studio", () => ({ Studio: () => <div>Studio</div> }));
vi.mock("./pages/Insights", () => ({ Insights: () => <div>Insights</div> }));
vi.mock("./pages/InsightArticle", () => ({ InsightArticle: () => <div>Insight Article</div> }));
vi.mock("./pages/Contact", () => ({ Contact: () => <div>Contact</div> }));
vi.mock("./pages/Careers", () => ({ Careers: () => <div>Careers</div> }));
vi.mock("./pages/PreviewPage", () => ({ PreviewPage: () => <div>Preview Page</div> }));
vi.mock("./pages/PrivacyPolicy", () => ({ PrivacyPolicy: () => <div>Privacy Policy</div> }));
vi.mock("./pages/PublicPage", () => ({
  PublicPage: () => <div>Public Page</div>,
  PublicPageContent: () => <div>Public Page Content</div>,
}));

vi.mock("./pages/admin/AdminLogin", () => ({ AdminLogin: () => <div>Admin Login</div> }));
vi.mock("./pages/admin/AdminDashboard", () => ({ AdminDashboard: () => <div>Admin Dashboard</div> }));
vi.mock("./pages/admin/AdminHomeEditor", () => ({ AdminHomeEditor: () => <div>Legacy Homepage Editor Content</div> }));
vi.mock("./pages/admin/AdminSites", () => ({ AdminSites: () => <div>Admin Sites</div> }));
vi.mock("./pages/admin/PagesAdmin", () => ({ PagesAdmin: () => <div>Pages Admin</div> }));
vi.mock("./pages/admin/PageEditor", () => ({ PageEditor: () => <div>Page Editor Content</div> }));
vi.mock("./pages/admin/TemplatesAdmin", () => ({ TemplatesAdmin: () => <div>Templates Admin</div> }));
vi.mock("./pages/admin/TemplatePreviewPage", () => ({ TemplatePreviewPage: () => <div>Template Preview</div> }));
vi.mock("./pages/admin/WorkAdmin", () => ({ WorkAdmin: () => <div>Work Admin</div> }));
vi.mock("./pages/admin/ProcessAdmin", () => ({ ProcessAdmin: () => <div>Process Admin</div> }));
vi.mock("./pages/admin/SiteSettingsAdmin", () => ({ SiteSettingsAdmin: () => <div>Site Settings</div> }));

import App, { shouldRedirectRootToAdmin } from "./App";

describe("App admin editor routes", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("keeps /admin/pages/home on the block-based page editor", async () => {
    window.history.pushState({}, "", "/admin/pages/home");

    render(<App />);

    expect(await screen.findByText("Page Editor Content")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Page Editor" })).toBeInTheDocument();
  });

  it("routes an imported page key to the block-based page editor", async () => {
    window.history.pushState({}, "", "/admin/pages/works");

    render(<App />);
    expect(await screen.findByText("Page Editor Content")).toBeInTheDocument();
  });

  it("routes a generic modern page key to the block-based page editor", async () => {
    window.history.pushState({}, "", "/admin/pages/custom__services");

    render(<App />);
    expect(await screen.findByText("Page Editor Content")).toBeInTheDocument();
  });

  it("keeps the canonical legacy route and redirects the old alias to it", async () => {
    window.history.pushState({}, "", "/admin/pages/home/legacy");

    render(<App />);

    expect(await screen.findByText("Legacy Homepage Editor Content")).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/admin/legacy/home");
    });
  });
});

describe("admin host routing", () => {
  it("redirects the root path on admin.dsgnfi.com to the admin dashboard", () => {
    expect(shouldRedirectRootToAdmin("admin.dsgnfi.com", "/")).toBe(true);
  });

  it("keeps the public root on the public site host", () => {
    expect(shouldRedirectRootToAdmin("dsgnfi.com", "/")).toBe(false);
    expect(shouldRedirectRootToAdmin("www.dsgnfi.com", "/")).toBe(false);
  });

  it("does not redirect non-root paths on the admin host", () => {
    expect(shouldRedirectRootToAdmin("admin.dsgnfi.com", "/contact")).toBe(false);
  });
});
