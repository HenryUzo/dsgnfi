import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminSites } from "./AdminSites";
import { useAdmin } from "../../auth/useAdmin";
import {
  getAdminSite,
  getAdminSites,
  getAdminTemplates,
  updateAdminSiteTemplate,
} from "../../services/adminSites";

vi.mock("../../auth/useAdmin", () => ({
  useAdmin: vi.fn(),
}));

vi.mock("../../services/adminSites", () => ({
  getAdminSites: vi.fn(),
  getAdminSite: vi.fn(),
  getAdminTemplates: vi.fn(),
  updateAdminSiteTemplate: vi.fn(),
}));

describe("AdminSites", () => {
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

    vi.mocked(getAdminSites).mockResolvedValue([
      {
        id: "site-1",
        name: "Main Site",
        slug: "main",
        status: "ACTIVE",
        isDefault: true,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-06T00:00:00.000Z",
        template: {
          id: "tpl-1",
          key: "agency-starter",
          name: "Agency Starter",
          category: "agency",
        },
        templateVersion: null,
        statusSummary: {
          templateAssigned: true,
          brandingReady: true,
          navigationReady: true,
          publishedPagesCount: 2,
          domainReady: false,
          previewReady: true,
          nextAction: "connect_domain",
        },
      },
      {
        id: "site-2",
        name: "Clinic West",
        slug: "clinic-west",
        status: "DRAFT",
        isDefault: false,
        createdAt: "2026-04-05T00:00:00.000Z",
        updatedAt: "2026-04-07T00:00:00.000Z",
        template: {
          id: "tpl-2",
          key: "clinic-starter",
          name: "Clinic Starter",
          category: "healthcare",
        },
        templateVersion: null,
        statusSummary: {
          templateAssigned: true,
          brandingReady: false,
          navigationReady: false,
          publishedPagesCount: 0,
          domainReady: false,
          previewReady: false,
          nextAction: "edit_branding",
        },
      },
    ]);

    vi.mocked(getAdminSite).mockImplementation(async (siteId: string) => {
      if (siteId === "site-1") {
        return {
          id: "site-1",
          name: "Main Site",
          slug: "main",
          status: "ACTIVE",
          isDefault: true,
          template: {
            id: "tpl-1",
            key: "agency-starter",
            name: "Agency Starter",
            category: "agency",
          },
          templateVersion: null,
          statusSummary: {
            templateAssigned: true,
            brandingReady: true,
            navigationReady: true,
            publishedPagesCount: 2,
            domainReady: false,
            previewReady: true,
            nextAction: "connect_domain",
          },
          settings: {
            logoUrl: null,
            faviconUrl: null,
            tagline: "Growth for brands",
            contactEmail: "main@example.com",
            contactPhone: null,
            address: null,
            socialLinks: null,
            seoTitle: "Main Site",
            seoDescription: null,
            theme: null,
            locale: "en",
            timezone: "Africa/Lagos",
          },
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-06T00:00:00.000Z",
        };
      }

      return {
        id: "site-2",
        name: "Clinic West",
        slug: "clinic-west",
        status: "DRAFT",
        isDefault: false,
        template: {
          id: "tpl-2",
          key: "clinic-starter",
          name: "Clinic Starter",
          category: "healthcare",
        },
        templateVersion: null,
        statusSummary: {
          templateAssigned: true,
          brandingReady: false,
          navigationReady: false,
          publishedPagesCount: 0,
          domainReady: false,
          previewReady: false,
          nextAction: "edit_branding",
        },
        settings: {
          logoUrl: null,
          faviconUrl: null,
          tagline: "Care that scales",
          contactEmail: "clinic@example.com",
          contactPhone: null,
          address: null,
          socialLinks: null,
          seoTitle: "Clinic West",
          seoDescription: null,
          theme: null,
          locale: "en",
          timezone: "Africa/Lagos",
        },
        createdAt: "2026-04-05T00:00:00.000Z",
        updatedAt: "2026-04-07T00:00:00.000Z",
      };
    });

    vi.mocked(getAdminTemplates).mockResolvedValue([
      {
        id: "tpl-1",
        key: "agency-starter",
        name: "Agency Starter",
        category: "agency",
        description: "Agency starter",
        status: "ACTIVE",
        sourceType: "STARTER",
        isActive: true,
        activeVersion: null,
      },
      {
        id: "tpl-blit",
        key: "agency-starter--blit-studio--mpzyaj6q",
        name: "Blit Studio",
        category: "agency",
        description: "Blit studio template",
        status: "ACTIVE",
        sourceType: "CUSTOM",
        isActive: true,
        activeVersion: {
          id: "tpl-version-blit",
          version: "1.0.0",
          manifestKey: "agency-starter",
        },
      },
    ]);

    vi.mocked(updateAdminSiteTemplate).mockResolvedValue({
      id: "site-2",
      name: "Clinic West",
      slug: "clinic-west",
      status: "DRAFT",
      isDefault: false,
      template: {
        id: "tpl-blit",
        key: "agency-starter--blit-studio--mpzyaj6q",
        name: "Blit Studio",
        category: "agency",
      },
      templateVersion: {
        id: "tpl-version-blit",
        version: "1.0.0",
        manifestKey: "agency-starter",
      },
      statusSummary: {
        templateAssigned: true,
        brandingReady: false,
        navigationReady: false,
        publishedPagesCount: 0,
        domainReady: false,
        previewReady: false,
        nextAction: "edit_branding",
      },
      settings: {
        logoUrl: null,
        faviconUrl: null,
        tagline: "Care that scales",
        contactEmail: "clinic@example.com",
        contactPhone: null,
        address: null,
        socialLinks: null,
        seoTitle: "Clinic West",
        seoDescription: null,
        theme: null,
        locale: "en",
        timezone: "Africa/Lagos",
      },
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-07T00:00:00.000Z",
      templateRelationship: {
        sourceType: "CUSTOM",
        baseTemplateKey: "agency-starter",
        activeVersionUsed: {
          id: "tpl-version-blit",
          version: "1.0.0",
          manifestKey: "agency-starter",
        },
        hasTemplateDrift: false,
      },
    });
  });

  it("renders a minimal multi-site operations page with progressive detail", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/sites"]}>
        <AdminSites />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAdminSites).toHaveBeenCalled();
      expect(getAdminSite).toHaveBeenCalledWith("site-1");
    });
    expect(await screen.findByText("Total sites")).toBeInTheDocument();

    expect(screen.getAllByText("Sites").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Manage tenant sites, compare readiness, and switch working context.")
    ).toBeInTheDocument();
    expect(screen.getByText("Avg. setup progress")).toBeInTheDocument();
    expect(screen.getByText("Current working site")).toBeInTheDocument();
    expect(screen.getByText("Site readiness mix")).toBeInTheDocument();
    expect(screen.getByText("All tenant sites")).toBeInTheDocument();
    expect(screen.getAllByText("Main Site").length).toBeGreaterThan(0);
    expect(screen.getByText("4 of 5 launch steps complete.")).toBeInTheDocument();
    expect(screen.getAllByText("80%").length).toBeGreaterThan(0);

    expect(screen.getAllByText("Clinic West").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Clinic Starter").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "View checklist" }));
    expect(screen.getByRole("dialog", { name: "Setup checklist" })).toBeInTheDocument();
    expect(screen.getByText("Domain connected")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]!);

    fireEvent.click(screen.getAllByRole("button", { name: "Switch site" })[0]!);
    expect(screen.getByRole("dialog", { name: "Switch working site?" })).toBeInTheDocument();
    expect(
      screen.getByText("You are about to make Clinic West the current working site.")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getAllByRole("button", { name: "Open details" })[1]!);

    await waitFor(() => {
      expect(getAdminSite).toHaveBeenCalledWith("site-2");
    });
    expect(await screen.findByText("Care that scales")).toBeInTheDocument();
    expect(screen.getAllByText("Clinic Starter").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Assign template"), {
      target: { value: "agency-starter--blit-studio--mpzyaj6q" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply template" }));

    await waitFor(() => {
      expect(updateAdminSiteTemplate).toHaveBeenCalledWith("site-2", {
        templateKey: "agency-starter--blit-studio--mpzyaj6q",
      });
    });
    expect(await screen.findAllByText("Blit Studio")).not.toHaveLength(0);
  });
});
