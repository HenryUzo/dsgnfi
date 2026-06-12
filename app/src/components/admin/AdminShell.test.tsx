import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMemo } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdmin } from "../../auth/useAdmin";
import { ApiError } from "../../lib/api";
import { sendAdminAiChat } from "../../services/adminAi";
import { useAdminAiPageContext } from "./AdminAiContext";
import { AdminShell } from "./AdminShell";

vi.mock("../../auth/useAdmin", () => ({
  useAdmin: vi.fn(),
}));

vi.mock("../../services/adminAi", () => ({
  sendAdminAiChat: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function findPagesNavLink() {
  const nav = screen.getByLabelText("Admin navigation");
  const links = Array.from(nav.querySelectorAll("a"));
  const match = links.find((link) => link.textContent?.trim().startsWith("Pages"));

  if (!match) {
    throw new Error("Pages link not found in admin navigation.");
  }

  return match;
}

function PageEditorContextProbe() {
  const context = useMemo(
    () => ({
      pageEditor: {
        pageKey: "about",
        title: "About",
        slug: "/about",
        pageTemplateKey: "standard-page",
        allowedBlockTypes: ["hero", "richText"],
        blockTypes: ["hero", "richText"],
      },
    }),
    []
  );

  useAdminAiPageContext(context);

  return <div>Page editor content</div>;
}

describe("AdminShell", () => {
  const changeSite = vi.fn();
  const logout = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(sendAdminAiChat).mockResolvedValue({
      role: "assistant",
      content: "You're on Home Page. 1. Open Pages. 2. Choose a page. 3. Save the draft, then publish.",
      guide: {
        intro: "You're on Home Page.",
        steps: ["Open Pages.", "Choose a page.", "Save the draft, then publish."],
        note: "This assistant can guide you, but it does not publish for you.",
        why: "Publishing happens from the page editor or the Pages list after saving draft changes.",
        intentId: "publish_page",
        primaryLink: { label: "Open page editor", href: "/admin/pages/home" },
        links: [{ label: "Open Pages", href: "/admin/pages" }],
      },
    });
    vi.mocked(useAdmin).mockReturnValue({
      admin: {
        ok: true,
        id: "admin-1",
        email: "admin@dsgnfi.com",
        memberships: [],
        currentTenant: { id: "tenant-1", name: "Dsgnfi", slug: "dsgnfi" },
        currentSite: {
          id: "site-1",
          name: "Main Site",
          slug: "main",
          status: "ACTIVE",
          isDefault: true,
        },
        currentRole: "OWNER",
      },
      loading: false,
      switchingSite: false,
      availableSites: [
        {
          id: "site-1",
          name: "Main Site",
          slug: "main",
          status: "ACTIVE",
          isDefault: true,
        },
        {
          id: "site-2",
          name: "Clinic West",
          slug: "clinic-west",
          status: "DRAFT",
          isDefault: false,
        },
      ],
      refresh: vi.fn(),
      logout,
      changeSite,
    });
  });

  it("renders admin navigation and switches site without leaving the current route", async () => {
    changeSite.mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={["/admin/work?tab=projects"]}>
        <Routes>
          <Route
            path="/admin/work"
            element={
              <AdminShell title="Work Setup">
                <LocationProbe />
              </AdminShell>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sites").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Templates").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pages").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tenant: Dsgnfi").length).toBeGreaterThan(0);
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/work?tab=projects");
    expect(screen.getAllByRole("link", { name: "View site" })[0]).toHaveAttribute("href", "/");
    expect(screen.getAllByLabelText("Admin breadcrumbs").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Pages" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Work Setup").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Work" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Process" })).not.toBeInTheDocument();

    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "site-2" },
    });

    await waitFor(() => {
      expect(changeSite).toHaveBeenCalledWith("site-2");
    });

    expect(screen.getByTestId("location")).toHaveTextContent("/admin/work?tab=projects");
  });

  it("persists the desktop sidebar collapse state", () => {
    render(
      <MemoryRouter initialEntries={["/admin/sites"]}>
        <Routes>
          <Route
            path="/admin/sites"
            element={
              <AdminShell title="Sites">
                <div>Sites content</div>
              </AdminShell>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const desktopSidebar = screen.getByLabelText("Admin navigation").closest("[data-sidebar-collapsed]");
    expect(desktopSidebar).toHaveAttribute("data-sidebar-collapsed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Collapse side navigation" }));

    expect(desktopSidebar).toHaveAttribute("data-sidebar-collapsed", "true");
    expect(window.localStorage.getItem("dsgnfi-admin-sidebar-collapsed")).toBe("true");
    expect(screen.getByRole("button", { name: "Expand side navigation" })).toBeInTheDocument();
  });

  it("scopes the public view link for non-main sites", () => {
    vi.mocked(useAdmin).mockReturnValue({
      admin: {
        ok: true,
        id: "admin-1",
        email: "admin@dsgnfi.com",
        memberships: [],
        currentTenant: { id: "tenant-1", name: "Dsgnfi", slug: "dsgnfi" },
        currentSite: {
          id: "site-2",
          name: "Clinic West",
          slug: "clinic-west",
          status: "DRAFT",
          isDefault: false,
        },
        currentRole: "OWNER",
      },
      loading: false,
      switchingSite: false,
      availableSites: [],
      refresh: vi.fn(),
      logout,
      changeSite,
    });

    render(
      <MemoryRouter initialEntries={["/admin/site-settings"]}>
        <Routes>
          <Route
            path="/admin/site-settings"
            element={
              <AdminShell title="Site Settings">
                <LocationProbe />
              </AdminShell>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getAllByRole("link", { name: "View site" })[0]).toHaveAttribute(
      "href",
      "/?site=clinic-west"
    );
  });

  it("keeps Pages active for the home editor route", () => {
    render(
      <MemoryRouter initialEntries={["/admin/pages/home"]}>
        <Routes>
          <Route
            path="/admin/pages/home"
            element={
              <AdminShell title="Home Page">
                <div>Home editor content</div>
              </AdminShell>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(findPagesNavLink()).toHaveClass("bg-white", "text-black");
    expect(screen.getAllByText("Home Page").length).toBeGreaterThan(0);
  });

  it("opens the AI admin guide and sends route-aware context", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/pages/home"]}>
        <Routes>
          <Route
            path="/admin/pages/home"
            element={
              <AdminShell title="Home Page">
                <div>Home editor content</div>
              </AdminShell>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open AI admin guide" }));
    expect(screen.getByRole("heading", { name: "Admin assistant" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "How do I publish a page?" }));

    await waitFor(() => {
      expect(sendAdminAiChat).toHaveBeenCalledWith({
        messages: [{ role: "user", content: "How do I publish a page?" }],
        context: {
          route: "/admin/pages/home",
          screenTitle: "Home Page",
          tenantName: "Dsgnfi",
          siteName: "Main Site",
          role: "OWNER",
          pageEditor: null,
        },
        attachments: [],
      });
    });

    expect(await screen.findByText("You're on Home Page.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open this screen" })).toHaveAttribute("href", "/admin/pages/home");
    expect(screen.getByRole("link", { name: "Open Pages" })).toHaveAttribute("href", "/admin/pages");
  });

  it("shows a restrained error when OpenAI is not configured", async () => {
    vi.mocked(sendAdminAiChat).mockRejectedValueOnce(
      new ApiError("OpenAI is not configured for this server.", 503, {
        code: "openai_not_configured",
      })
    );

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminShell title="Dashboard">
                <div>Dashboard content</div>
              </AdminShell>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open AI admin guide" }));
    fireEvent.click(screen.getByRole("button", { name: "How do I edit navigation?" }));

    expect(
      await screen.findByText(/OpenAI is not configured for this server yet/)
    ).toBeInTheDocument();
  });

  it("sends page editor metadata without draft content", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/pages/about"]}>
        <Routes>
          <Route
            path="/admin/pages/about"
            element={
              <AdminShell title="Page Editor">
                <PageEditorContextProbe />
                <span>Private draft sentence that should not be sent</span>
              </AdminShell>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open AI admin guide" }));
    fireEvent.change(screen.getByPlaceholderText("Ask for admin guidance..."), {
      target: { value: "What can I edit on this page?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(sendAdminAiChat).toHaveBeenCalled();
    });

    const request = vi.mocked(sendAdminAiChat).mock.calls.at(-1)?.[0];
    expect(request?.context.pageEditor).toEqual({
      pageKey: "about",
      title: "About",
      slug: "/about",
      pageTemplateKey: "standard-page",
      allowedBlockTypes: ["hero", "richText"],
      blockTypes: ["hero", "richText"],
    });
    expect(JSON.stringify(request)).not.toContain("Private draft sentence");
  });
});
