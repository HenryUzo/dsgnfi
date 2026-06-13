import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PagesAdmin } from "./PagesAdmin";
import { useAdmin } from "../../auth/useAdmin";
import {
  createAdminPage,
  deleteAdminPage,
  duplicateAdminPage,
  listAdminPages,
  listAdminPageTemplates,
  renameAdminPageTitle,
  setAdminPageVisibility,
  updateAdminPageMeta,
} from "../../services/siteSettings";

vi.mock("../../auth/useAdmin", () => ({
  useAdmin: vi.fn(),
}));

vi.mock("../../services/siteSettings", () => ({
  listAdminPages: vi.fn(),
  listAdminPageTemplates: vi.fn(),
  createAdminPage: vi.fn(),
  renameAdminPageTitle: vi.fn(),
  updateAdminPageMeta: vi.fn(),
  setAdminPageVisibility: vi.fn(),
  duplicateAdminPage: vi.fn(),
  deleteAdminPage: vi.fn(),
}));

function makeEditorResolution(
  overrides: Partial<Awaited<ReturnType<typeof listAdminPages>>[number]["editorResolution"]> = {}
) {
  return {
    hasModernPage: true,
    hasModernDraft: true,
    hasModernPublishedRevision: true,
    hasLegacyCmsContent: false,
    hasPublishedLegacyContent: false,
    preferredEditor: "BLOCK" as const,
    editorRoute: "/admin/pages/home",
    legacyEditorRoute: null,
    contentMode: "MODERN_ONLY" as const,
    compatibilityReason: "MODERN_PAGE_AVAILABLE" as const,
    migrationAvailable: false,
    ...overrides,
  };
}

function makeSummary(overrides: Partial<Awaited<ReturnType<typeof listAdminPages>>[number]>) {
  return {
    id: "page-home",
    pageKey: "home",
    title: "Home",
    slug: "/",
    isVisible: true,
    isRequired: true,
    canDelete: false,
    status: "PUBLISHED" as const,
    seoTitle: "Home",
    seoDescription: "Homepage",
    updatedAt: "2026-05-14T10:00:00.000Z",
    modernStatus: "PUBLISHED" as const,
    legacyStatus: "NONE" as const,
    draftRevisionNumber: 2,
    publishedRevisionNumber: 2,
    publishedAt: "2026-05-14T10:00:00.000Z",
    lineage: {
      sourceTemplateKey: "agency-starter",
      sourceTemplateName: "Agency Starter",
      sourceTemplateVersion: "1.0.0",
      sourcePageBlueprintKey: "home",
      status: "MODIFIED" as const,
      isTracked: true,
    },
    hierarchy: {
      role: "MAIN" as const,
      defaultParentPageKey: null,
      defaultParentTitle: null,
      defaultParentSlug: null,
    },
    editorResolution: makeEditorResolution(),
    ...overrides,
  };
}

function makeDetail(
  overrides: Partial<Awaited<ReturnType<typeof createAdminPage>>> = {}
) {
  return {
    ...makeSummary(overrides),
    allowedBlockTypes: ["hero", "richText", "cta"],
    content: { blocks: [] },
  };
}

describe("PagesAdmin", () => {
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

    vi.mocked(listAdminPages).mockResolvedValue([
      makeSummary({}),
      makeSummary({
        id: "page-services",
        pageKey: "custom__services",
        title: "Services",
        slug: "/services",
        isRequired: false,
        canDelete: true,
        status: "DRAFT",
        seoTitle: "Services",
        seoDescription: "Services page",
        draftRevisionNumber: 1,
        publishedRevisionNumber: null,
        publishedAt: null,
        lineage: {
          sourceTemplateKey: "agency-starter",
          sourceTemplateName: "Agency Starter",
          sourceTemplateVersion: "1.0.0",
          sourcePageBlueprintKey: "standard-content",
          status: "INHERITED",
          isTracked: true,
        },
        hierarchy: {
          role: "MAIN",
          defaultParentPageKey: null,
          defaultParentTitle: null,
          defaultParentSlug: null,
        },
      }),
    ]);

    vi.mocked(listAdminPageTemplates).mockResolvedValue([
      {
        templateKey: "standard-content",
        label: "Standard Content Page",
        description: "General purpose page",
        defaultTitle: "New Page",
        allowedBlockTypes: ["hero", "richText", "cta"],
      },
    ]);

    vi.mocked(createAdminPage).mockResolvedValue(
      makeDetail({
        id: "page-team",
        pageKey: "custom__team",
        title: "Team",
        slug: "/team",
        isRequired: false,
        canDelete: true,
        status: "DRAFT",
        seoTitle: "Team",
        seoDescription: null,
        draftRevisionNumber: 1,
        publishedRevisionNumber: null,
        publishedAt: null,
        lineage: {
          sourceTemplateKey: "agency-starter",
          sourceTemplateName: "Agency Starter",
          sourceTemplateVersion: "1.0.0",
          sourcePageBlueprintKey: "standard-content",
          status: "INHERITED",
          isTracked: true,
        },
        hierarchy: {
          role: "MAIN",
          defaultParentPageKey: null,
          defaultParentTitle: null,
          defaultParentSlug: null,
        },
      })
    );

    vi.mocked(renameAdminPageTitle).mockImplementation(async (pageKey, title) =>
      makeDetail({
        id: pageKey === "home" ? "page-home" : "page-services",
        pageKey,
        title,
        slug: pageKey === "home" ? "/" : "/services",
        isRequired: pageKey === "home",
        canDelete: pageKey !== "home",
        status: pageKey === "home" ? "PUBLISHED" : "DRAFT",
        seoTitle: title,
        seoDescription: pageKey === "home" ? "Homepage" : "Services page",
        draftRevisionNumber: pageKey === "home" ? 2 : 1,
        publishedRevisionNumber: pageKey === "home" ? 2 : null,
        publishedAt: pageKey === "home" ? "2026-05-14T10:00:00.000Z" : null,
        lineage:
          pageKey === "home"
            ? {
                sourceTemplateKey: "agency-starter",
                sourceTemplateName: "Agency Starter",
                sourceTemplateVersion: "1.0.0",
                sourcePageBlueprintKey: "home",
                status: "MODIFIED",
                isTracked: true,
              }
            : {
                sourceTemplateKey: "agency-starter",
                sourceTemplateName: "Agency Starter",
                sourceTemplateVersion: "1.0.0",
                sourcePageBlueprintKey: "standard-content",
                status: "MODIFIED",
                isTracked: true,
              },
      })
    );

    vi.mocked(updateAdminPageMeta).mockImplementation(async (pageKey, input) =>
      makeDetail({
        id: pageKey === "home" ? "page-home" : "page-services",
        pageKey,
        title: input.title,
        slug: input.slug,
        isRequired: pageKey === "home",
        canDelete: pageKey !== "home",
        status: pageKey === "home" ? "PUBLISHED" : "DRAFT",
        seoTitle: input.seoTitle ?? input.title,
        seoDescription: input.seoDescription ?? null,
        draftRevisionNumber: pageKey === "home" ? 2 : 1,
        publishedRevisionNumber: pageKey === "home" ? 2 : null,
        publishedAt: pageKey === "home" ? "2026-05-14T10:00:00.000Z" : null,
        lineage:
          pageKey === "home"
            ? {
                sourceTemplateKey: "agency-starter",
                sourceTemplateName: "Agency Starter",
                sourceTemplateVersion: "1.0.0",
                sourcePageBlueprintKey: "home",
                status: "MODIFIED",
                isTracked: true,
              }
            : {
                sourceTemplateKey: "agency-starter",
                sourceTemplateName: "Agency Starter",
                sourceTemplateVersion: "1.0.0",
                sourcePageBlueprintKey: "standard-content",
                status: "MODIFIED",
                isTracked: true,
              },
      })
    );

    vi.mocked(setAdminPageVisibility).mockImplementation(async (pageKey, isVisible) =>
      makeDetail({
        id: pageKey === "home" ? "page-home" : "page-services",
        pageKey,
        title: pageKey === "home" ? "Home" : "Services",
        slug: pageKey === "home" ? "/" : "/services",
        isVisible,
        isRequired: pageKey === "home",
        canDelete: pageKey !== "home",
        status: pageKey === "home" ? "PUBLISHED" : "DRAFT",
        seoTitle: pageKey === "home" ? "Home" : "Services",
        seoDescription: pageKey === "home" ? "Homepage" : "Services page",
        draftRevisionNumber: pageKey === "home" ? 2 : 1,
        publishedRevisionNumber: pageKey === "home" ? 2 : null,
        publishedAt: pageKey === "home" ? "2026-05-14T10:00:00.000Z" : null,
        lineage:
          pageKey === "home"
            ? {
                sourceTemplateKey: "agency-starter",
                sourceTemplateName: "Agency Starter",
                sourceTemplateVersion: "1.0.0",
                sourcePageBlueprintKey: "home",
                status: "MODIFIED",
                isTracked: true,
              }
            : {
                sourceTemplateKey: "agency-starter",
                sourceTemplateName: "Agency Starter",
                sourceTemplateVersion: "1.0.0",
                sourcePageBlueprintKey: "standard-content",
                status: "INHERITED",
                isTracked: true,
              },
      })
    );

    vi.mocked(duplicateAdminPage).mockResolvedValue(
      makeDetail({
        id: "page-services-copy",
        pageKey: "custom__services-copy",
        title: "Services Copy",
        slug: "/services-copy",
        isRequired: false,
        canDelete: true,
        status: "DRAFT",
        seoTitle: "Services Copy",
        seoDescription: "Services page",
        draftRevisionNumber: 1,
        publishedRevisionNumber: null,
        publishedAt: null,
        lineage: {
          sourceTemplateKey: "agency-starter",
          sourceTemplateName: "Agency Starter",
          sourceTemplateVersion: "1.0.0",
          sourcePageBlueprintKey: "standard-content",
          status: "MODIFIED",
          isTracked: true,
        },
      })
    );

    vi.mocked(deleteAdminPage).mockResolvedValue("custom__services");
  });

  it("loads the dashboard and creates a template-approved page from the modal", async () => {
    render(
      <MemoryRouter>
        <PagesAdmin />
      </MemoryRouter>
    );

    expect(await screen.findByText("Current site pages")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pages" })).toBeInTheDocument();
    expect(screen.getByText("Total pages")).toBeInTheDocument();
    expect(screen.getByText("Guided draft setup")).toBeInTheDocument();
    expect(screen.getByText("Guidance")).toBeInTheDocument();
    expect(screen.getByText("Page health")).toBeInTheDocument();
    expect(screen.getByText("Standard Content Page")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View site/i })).toHaveAttribute("href", "/");

    fireEvent.click(screen.getByRole("button", { name: /Create page/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("Standard Content Page").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Team" },
    });
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "team" },
    });
    fireEvent.change(screen.getByLabelText("SEO title"), {
      target: { value: "Team | DSGNFI" },
    });
    fireEvent.change(screen.getByLabelText("Visibility"), {
      target: { value: "hidden" },
    });
    fireEvent.change(screen.getByLabelText("Parent page"), {
      target: { value: "home" },
    });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Create page/i }));

    await waitFor(() => {
      expect(createAdminPage).toHaveBeenCalledWith(
        expect.objectContaining({
          templateKey: "standard-content",
          title: "Team",
          slug: "/team",
          seoTitle: "Team | DSGNFI",
          isVisible: false,
          hierarchyRole: "INNER",
          defaultParentPageKey: "home",
        })
      );
    });
  });

  it("scopes public page links for non-main sites", async () => {
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
          status: "ACTIVE",
          isDefault: false,
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

    render(
      <MemoryRouter>
        <PagesAdmin />
      </MemoryRouter>
    );

    expect(await screen.findByText("Current site pages")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /View site/i })).toHaveAttribute(
      "href",
      "/?site=clinic-west"
    );
  });

  it("supports inline rename, duplicate, bulk archive, and delete", async () => {
    render(
      <MemoryRouter>
        <PagesAdmin />
      </MemoryRouter>
    );

    expect(await screen.findByText("Current site pages")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Rename Services"));
    fireEvent.change(screen.getByLabelText("Inline title for Services"), {
      target: { value: "Service Lines" },
    });
    fireEvent.click(screen.getByLabelText("Save title for Services"));

    await waitFor(() => {
      expect(renameAdminPageTitle).toHaveBeenCalledWith("custom__services", "Service Lines");
    });

    fireEvent.pointerDown(screen.getByLabelText("Page actions for Service Lines"));
    fireEvent.click(screen.getByText("Duplicate"));

    await waitFor(() => {
      expect(duplicateAdminPage).toHaveBeenCalledWith("custom__services");
    });

    fireEvent.click(screen.getByLabelText("Select Service Lines"));
    fireEvent.click(screen.getByRole("button", { name: "Archive selected" }));

    await waitFor(() => {
      expect(setAdminPageVisibility).toHaveBeenCalledWith("custom__services", false);
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));

    await waitFor(() => {
      expect(deleteAdminPage).toHaveBeenCalledWith("custom__services");
    });
  });

  it("filters and sorts visible table rows", async () => {
    render(
      <MemoryRouter>
        <PagesAdmin />
      </MemoryRouter>
    );

    expect(await screen.findByText("Current site pages")).toBeInTheDocument();
    expect(await screen.findByLabelText("Rename Home")).toBeInTheDocument();
    expect(screen.getByLabelText("Rename Services")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search pages"), {
      target: { value: "services" },
    });

    expect(screen.queryByLabelText("Rename Home")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Rename Services")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search pages"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Filter status"), {
      target: { value: "modified" },
    });

    expect(screen.getByLabelText("Rename Home")).toBeInTheDocument();
    expect(screen.queryByLabelText("Rename Services")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter status"), {
      target: { value: "all" },
    });
    fireEvent.change(screen.getByLabelText("Filter type"), {
      target: { value: "custom" },
    });

    expect(screen.queryByLabelText("Rename Home")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Rename Services")).toBeInTheDocument();
  });

  it("uses the backend-provided editor route and surfaces mixed or legacy modes", async () => {
    vi.mocked(listAdminPages).mockResolvedValue([
      makeSummary({
        editorResolution: makeEditorResolution({
          preferredEditor: "LEGACY",
          editorRoute: "/admin/legacy/home",
          legacyEditorRoute: "/admin/legacy/home",
          contentMode: "LEGACY_ONLY",
          compatibilityReason: "LEGACY_ONLY_CONTENT",
          migrationAvailable: true,
          hasLegacyCmsContent: true,
        }),
        modernStatus: "DRAFT",
        legacyStatus: "PUBLISHED",
      }),
      makeSummary({
        id: "page-works",
        pageKey: "works",
        title: "Works",
        slug: "/works",
        status: "DRAFT",
        modernStatus: "DRAFT",
        legacyStatus: "NONE",
        draftRevisionNumber: 1,
        publishedRevisionNumber: null,
        publishedAt: null,
        editorResolution: makeEditorResolution({
          editorRoute: "/admin/pages/works",
          contentMode: "MIXED",
          compatibilityReason: "MODERN_AND_LEGACY_COEXIST",
          legacyEditorRoute: "/admin/legacy/home",
          migrationAvailable: true,
          hasLegacyCmsContent: true,
          hasPublishedLegacyContent: true,
        }),
      }),
    ]);

    render(
      <MemoryRouter>
        <PagesAdmin />
      </MemoryRouter>
    );

    expect(await screen.findByText("Current site pages")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open legacy editor" })).toHaveAttribute(
      "href",
      "/admin/legacy/home"
    );
    expect(screen.getByText("Mixed content")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByLabelText("Page actions for Works"));
    const menu = await screen.findByRole("menu");
    expect(
      within(menu).getByText("Open legacy editor").closest("a")
    ).toHaveAttribute("href", "/admin/legacy/home");
    expect(within(menu).getByText("Preview migration").closest("a")).toHaveAttribute(
      "href",
      "/admin/pages/works?migrationPreview=1"
    );
  });
});
