import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdmin } from "../../auth/useAdmin";
import { getAdminDashboardSummary } from "../../services/adminDashboard";
import { AdminDashboard } from "./AdminDashboard";

vi.mock("../../auth/useAdmin", () => ({
  useAdmin: vi.fn(),
}));

vi.mock("../../services/adminDashboard", () => ({
  getAdminDashboardSummary: vi.fn(),
}));

describe("AdminDashboard", () => {
  const baseSummary = {
    currentSite: {
      id: "site-1",
      name: "Main Site",
      slug: "main",
      status: "ACTIVE",
      statusLabel: "Needs Attention" as const,
      templateName: "Agency Starter",
      lastEditedAt: "2026-05-28T12:00:00.000Z",
      progressText: "4 of 6 setup steps complete",
      primaryAction: {
        id: "complete_navigation" as const,
        label: "Complete navigation",
        to: "/admin/site-settings",
      },
      secondaryActions: [
        {
          id: "view_public_site" as const,
          label: "View public site",
          to: "/",
        },
        {
          id: "open_site_settings" as const,
          label: "Open site settings",
          to: "/admin/site-settings",
        },
      ],
    },
    readiness: {
      completedCount: 4,
      totalCount: 6,
      publishedPagesCount: 2,
      draftPagesCount: 1,
      items: [
        {
          key: "template" as const,
          label: "Template selected",
          helper: "Agency Starter applied to this site.",
          state: "complete" as const,
        },
        {
          key: "branding" as const,
          label: "Branding configured",
          helper: "Name, brand presentation, and core contact details are saved.",
          state: "complete" as const,
        },
        {
          key: "navigation" as const,
          label: "Navigation configured",
          helper: "No visible primary navigation links are configured yet.",
          state: "needs_action" as const,
          action: {
            id: "complete_navigation" as const,
            label: "Complete navigation",
            to: "/admin/site-settings",
          },
        },
        {
          key: "domain" as const,
          label: "Domain connected",
          helper: "Primary domain main.dsgnfi.com is ready for visitors.",
          state: "complete" as const,
        },
        {
          key: "preview" as const,
          label: "Preview generated",
          helper: "Latest preview link is active until 5/29/2026, 11:00:00 AM.",
          state: "complete" as const,
        },
        {
          key: "pages" as const,
          label: "Pages published",
          helper: "2 pages published, 1 draft pending review.",
          state: "warning" as const,
          action: {
            id: "review_publish" as const,
            label: "Review and publish",
            to: "/admin/pages",
          },
        },
      ],
    },
    recommendedAction: {
      id: "complete_navigation" as const,
      label: "Complete navigation",
      to: "/admin/site-settings",
    },
    issues: [
      {
        id: "draft-pages",
        title: "1 page still in draft",
        helper: "2 pages already live, but draft work is still pending review.",
        severity: "warning" as const,
        action: {
          id: "review_publish" as const,
          label: "Review and publish",
          to: "/admin/pages",
        },
      },
    ],
    recentActivity: [
      {
        id: "act-1",
        timestamp: "2026-05-28T10:00:00.000Z",
        actor: "admin",
        summary: "Branding updated",
        to: "/admin/site-settings",
      },
      {
        id: "act-2",
        timestamp: "2026-05-28T11:00:00.000Z",
        actor: "admin",
        summary: "Preview generated",
        to: "/admin/site-settings",
      },
    ],
    recentSites: [
      {
        id: "site-2",
        name: "Clinic West",
        status: "DRAFT",
        lastEditedAt: "2026-05-27T12:00:00.000Z",
        nextActionLabel: "Complete branding",
      },
    ],
    templateShortcut: {
      title: "Agency Starter",
      helper:
        "Current starter foundation for this site. Compare or reassign from the template library.",
      action: {
        id: "open_template_library" as const,
        label: "Open template library",
        to: "/admin/templates",
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
      availableSites: [],
      refresh: vi.fn(),
      logout: vi.fn(),
      changeSite: vi.fn(),
    });

    vi.mocked(getAdminDashboardSummary).mockResolvedValue(baseSummary);
  });

  it("renders a compact summary-first dashboard instead of the old expanded dashboard", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAdminDashboardSummary).toHaveBeenCalledWith("site-1");
    });

    expect(screen.getByText("Overview of the active site and recommended next steps.")).toBeInTheDocument();
    expect(screen.getByText("Main Site")).toBeInTheDocument();
    expect(screen.getByText("4 of 6 setup steps complete")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue setup" })).toHaveAttribute(
      "href",
      "/admin/site-settings"
    );

    expect(screen.getByText("Setup progress")).toBeInTheDocument();
    expect(screen.getByText("Publish status")).toBeInTheDocument();
    expect(screen.getByText("Site health")).toBeInTheDocument();
    expect(screen.getByText("Domain & preview")).toBeInTheDocument();
    expect(screen.getByText("Activity summary")).toBeInTheDocument();
    expect(screen.getAllByText("Template").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Branding updated").length).toBeGreaterThan(0);
    expect(screen.getByText("1 item needs review")).toBeInTheDocument();

    expect(screen.queryByText("Starter and custom templates")).not.toBeInTheDocument();
    expect(screen.queryByText("Current site control")).not.toBeInTheDocument();
    expect(screen.queryByText("Setup and publish readiness")).not.toBeInTheDocument();
    expect(screen.queryByText("Open Home Editor")).not.toBeInTheDocument();
    expect(screen.queryByText("Open Work Editor")).not.toBeInTheDocument();
    expect(screen.queryByText("Open Process Editor")).not.toBeInTheDocument();
  });

  it("opens detailed checklist and activity only on demand", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAdminDashboardSummary).toHaveBeenCalledWith("site-1");
    });

    expect(screen.queryByText("No visible primary navigation links are configured yet.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open checklist" }));

    expect(await screen.findByText("Setup checklist")).toBeInTheDocument();
    expect(screen.getByText("Navigation configured")).toBeInTheDocument();
    expect(screen.getByText("No visible primary navigation links are configured yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "View all" }));

    expect(await screen.findByText("Activity log")).toBeInTheDocument();
    expect(screen.getAllByText("Preview generated").length).toBeGreaterThan(0);
  });

  it("renders the healthy issue state when there are no blockers", async () => {
    vi.mocked(getAdminDashboardSummary).mockResolvedValueOnce({
      ...baseSummary,
      currentSite: {
        ...baseSummary.currentSite,
        statusLabel: "Active",
        progressText: "6 of 6 setup steps complete",
        primaryAction: {
          id: "open_editor",
          label: "Open editor",
          to: "/admin/pages",
        },
        secondaryActions: [],
      },
      readiness: {
        ...baseSummary.readiness,
        completedCount: 6,
        draftPagesCount: 0,
      },
      recommendedAction: {
        id: "open_editor",
        label: "Open editor",
        to: "/admin/pages",
      },
      issues: [],
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("Site healthy")).toBeInTheDocument();
    expect(screen.getByText("No active blockers or warnings.")).toBeInTheDocument();
  });
});
