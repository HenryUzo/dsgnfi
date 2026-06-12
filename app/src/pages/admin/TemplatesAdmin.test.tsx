import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplatesAdmin } from "./TemplatesAdmin";
import { useAdmin } from "../../auth/useAdmin";
import {
  createAdminTemplate,
  getAdminSites,
  getAdminTemplate,
  getAdminTemplateUsages,
  getAdminTemplates,
} from "../../services/adminSites";

vi.mock("../../auth/useAdmin", () => ({
  useAdmin: vi.fn(),
}));

vi.mock("../../services/adminSites", () => ({
  createAdminTemplate: vi.fn(),
  getAdminSite: vi.fn(),
  getAdminSites: vi.fn(),
  getAdminTemplate: vi.fn(),
  getAdminTemplateUsages: vi.fn(),
  getAdminTemplates: vi.fn(),
  updateAdminTemplate: vi.fn(),
  publishAdminTemplate: vi.fn(),
}));

function makeTemplateDetail(key: string, sourceType: "STARTER" | "CUSTOM" = "STARTER") {
  return {
    id: `template-${key}`,
    key,
    name: key === "agency-starter" ? "Agency Starter" : "Studio Custom",
    category: "agency" as const,
    description: "Template detail",
    status: "ACTIVE" as const,
    sourceType,
    baseTemplateKey: sourceType === "CUSTOM" ? "agency-starter" : null,
    activeVersion: {
      id: `tv-${key}`,
      version: "1.0.0",
      manifestKey: key,
    },
    manifest: {
      key,
      version: "1.0.0" as const,
      name: "Template",
      category: "agency" as const,
      description: "Template detail",
      starterNavigation: {
        primary: [{ label: "Home", pageKey: "home" }],
        footer: [{ label: "Contact", pageKey: "contact" }],
      },
      starterContentHints: {
        processEnabled: true,
        workEnabled: true,
      },
      editableFieldGroups: ["branding", "navigation"],
      starterSiteSettings: {
        tagline: "Built for agencies",
        contactEmail: "hello@example.com",
        locale: "en",
        timezone: "Africa/Lagos",
        theme: { primaryColor: "#123456" },
      },
      supportedPages: [
        {
          pageKey: "home" as const,
          title: "Home",
          slug: "/",
          isRequired: true,
          allowedBlockTypes: ["hero", "cta"],
          defaultBlocks: [{ id: "hero-1", type: "hero", data: {} }],
          seoDefaults: { seoTitle: "Home", seoDescription: "Home page" },
        },
        {
          pageKey: "contact" as const,
          title: "Contact",
          slug: "/contact",
          isRequired: true,
          allowedBlockTypes: ["contact", "cta"],
          defaultBlocks: [{ id: "contact-1", type: "contact", data: {} }],
          seoDefaults: { seoTitle: "Contact", seoDescription: "Contact page" },
        },
      ],
    },
    publishedManifest: null,
  };
}

describe("TemplatesAdmin", () => {
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

    vi.mocked(getAdminTemplates).mockResolvedValue([
      {
        id: "template-agency-starter",
        key: "agency-starter",
        name: "Agency Starter",
        category: "agency",
        description: "Agency template",
        status: "ACTIVE",
        sourceType: "STARTER",
        activeVersion: { version: "1.0.0", manifestKey: "agency-starter" },
        usageCount: 1,
      },
      {
        id: "template-studio-custom",
        key: "studio-custom",
        name: "Studio Custom",
        category: "agency",
        description: "Custom preset",
        status: "ACTIVE",
        sourceType: "CUSTOM",
        baseTemplateKey: "agency-starter",
        activeVersion: { version: "1.0.1", manifestKey: "agency-starter" },
        usageCount: 2,
      },
    ]);

    vi.mocked(getAdminSites).mockResolvedValue([
      {
        id: "site-1",
        name: "Main Site",
        slug: "main",
        status: "ACTIVE",
        isDefault: true,
        template: null,
        templateVersion: null,
        statusSummary: {
          templateAssigned: true,
          brandingReady: true,
          navigationReady: true,
          publishedPagesCount: 2,
          domainReady: false,
          previewReady: false,
          nextAction: "connect_domain",
        },
      },
    ]);

    vi.mocked(getAdminTemplate).mockImplementation(async (key: string) =>
      makeTemplateDetail(key, key === "studio-custom" ? "CUSTOM" : "STARTER")
    );
    vi.mocked(getAdminTemplateUsages).mockResolvedValue([
      {
        id: "site-1",
        name: "Main Site",
        slug: "main",
        status: "ACTIVE",
        templateVersion: { id: "tv-1", version: "1.0.1", manifestKey: "agency-starter" },
        hasTemplateDrift: false,
      },
    ]);
  });

  it("renders starter and custom templates and creates a custom template from a starter", async () => {
    vi.mocked(createAdminTemplate).mockResolvedValue(makeTemplateDetail("studio-custom", "CUSTOM"));

    render(
      <MemoryRouter>
        <TemplatesAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAdminTemplates).toHaveBeenCalled();
      expect(getAdminTemplate).toHaveBeenCalledWith("agency-starter");
    });

    expect(screen.getByRole("heading", { name: "Templates" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Browse starter presets, inspect defaults, and create reusable custom templates."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Starter templates")).toBeInTheDocument();
    expect(screen.getByText("Custom templates")).toBeInTheDocument();
    expect(screen.getByText("Template library")).toBeInTheDocument();
    expect(screen.getAllByText("Starter").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Custom").length).toBeGreaterThan(0);
    expect(screen.queryByText("Template editor")).not.toBeInTheDocument();
    expect(screen.queryByText("Inspect defaults, usage, and safe actions.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Agency Starter Agency/i }));
    expect(
      await screen.findByText("Inspect defaults, usage, and safe actions.")
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /View usage/i })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]!);

    fireEvent.change(
      screen.getByPlaceholderText("Search templates by name, category, or module..."),
      {
        target: { value: "studio" },
      }
    );
    expect(screen.getAllByText("Studio Custom").length).toBeGreaterThan(0);

    fireEvent.change(
      screen.getByPlaceholderText("Search templates by name, category, or module..."),
      {
        target: { value: "" },
      }
    );

    fireEvent.click(screen.getByRole("button", { name: "Create template" }));
    expect(screen.getByRole("dialog", { name: "Create template" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4: choose the source.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByPlaceholderText("Template name"), {
      target: { value: "Studio Custom" },
    });
    fireEvent.change(screen.getByPlaceholderText("What should this preset scaffold?"), {
      target: { value: "Preset for branded launches" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 3 of 4: choose included defaults.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 4 of 4: review and create.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));

    await waitFor(() => {
      expect(createAdminTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Studio Custom",
          sourceTemplateKey: "agency-starter",
        })
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Create template" })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Studio Custom Agency/i }));
    fireEvent.click(await screen.findByRole("button", { name: /View usage/i }));
    await waitFor(() => {
      expect(getAdminTemplateUsages).toHaveBeenCalled();
    });
    expect(await screen.findByText("Template usage")).toBeInTheDocument();
    expect(screen.getByText("Synced")).toBeInTheDocument();
  });

  it("keeps template management read-only for editors", async () => {
    vi.mocked(useAdmin).mockReturnValue({
      admin: {
        ok: true,
        id: "editor-1",
        email: "editor@dsgnfi.com",
        memberships: [],
        currentTenant: { id: "tenant-1", name: "Dsgnfi", slug: "dsgnfi" },
        currentSite: {
          id: "site-1",
          name: "Main Site",
          slug: "main",
          status: "ACTIVE",
          isDefault: true,
        },
        currentRole: "EDITOR",
      },
      loading: false,
      switchingSite: false,
      availableSites: [],
      refresh: vi.fn(),
      logout: vi.fn(),
      changeSite: vi.fn(),
    });

    render(
      <MemoryRouter>
        <TemplatesAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAdminTemplates).toHaveBeenCalled();
    });

    expect(
      screen.getByText(/only owners and admins can create or publish/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create template" })).toBeDisabled();
    expect(screen.queryByText("Template editor")).not.toBeInTheDocument();
  });
});
