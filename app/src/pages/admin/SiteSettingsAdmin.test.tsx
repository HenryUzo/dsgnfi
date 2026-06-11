import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteSettingsAdmin } from "./SiteSettingsAdmin";
import { useAdmin } from "../../auth/useAdmin";
import {
  createAdminDomain,
  createAdminPreviewToken,
  getAdminSiteNavigation,
  getAdminSiteSettings,
  listAdminDomains,
  listAdminAssets,
  listAdminPages,
  listAdminPreviewTokens,
  setPrimaryAdminDomain,
  updateAdminSiteSettings,
} from "../../services/siteSettings";

vi.mock("../../auth/useAdmin", () => ({
  useAdmin: vi.fn(),
}));

vi.mock("../../services/siteSettings", () => ({
  getAdminSiteSettings: vi.fn(),
  updateAdminSiteSettings: vi.fn(),
  getAdminSiteNavigation: vi.fn(),
  updateAdminSiteNavigation: vi.fn(),
  listAdminAssets: vi.fn(),
  listAdminPages: vi.fn(),
  listAdminDomains: vi.fn(),
  createAdminDomain: vi.fn(),
  verifyAdminDomain: vi.fn(),
  setPrimaryAdminDomain: vi.fn(),
  deleteAdminDomain: vi.fn(),
  listAdminPreviewTokens: vi.fn(),
  createAdminPreviewToken: vi.fn(),
  revokeAdminPreviewToken: vi.fn(),
  uploadAdminAsset: vi.fn(),
  updateAdminAsset: vi.fn(),
  deleteAdminAsset: vi.fn(),
}));

describe("SiteSettingsAdmin", () => {
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

    vi.mocked(getAdminSiteSettings).mockResolvedValue({
      site: { id: "site-1", name: "Main Site", slug: "main" },
      settings: {
        siteName: "Main Site",
        logoUrl: null,
        faviconUrl: null,
        tagline: "Main tagline",
        contactEmail: "hello@example.com",
        contactPhone: null,
        address: null,
        socialLinks: {},
        seoTitle: "Main SEO",
        seoDescription: null,
        locale: "en",
        timezone: "Africa/Lagos",
      },
      theme: { primaryColor: "#123456" },
      pages: [],
      navigation: { primary: [], footer: [] },
    });
    vi.mocked(getAdminSiteNavigation).mockResolvedValue({ primary: [], footer: [] });
    vi.mocked(listAdminAssets).mockResolvedValue([]);
    vi.mocked(listAdminDomains).mockResolvedValue([
      {
        id: "domain-pending",
        hostname: "preview.example.com",
        type: "CUSTOM",
        isPrimary: false,
        verificationStatus: "PENDING",
        verifiedAt: null,
        verificationInstructions: {
          host: "_dsgnfi-verification.preview.example.com",
          type: "TXT",
          value: "token",
        },
        createdAt: "",
        updatedAt: "",
      },
    ]);
    vi.mocked(listAdminPreviewTokens).mockResolvedValue([]);
    vi.mocked(listAdminPages).mockResolvedValue([
      {
        id: "page-home",
        pageKey: "home",
        title: "Home",
        slug: "/",
        isVisible: true,
        isRequired: true,
        canDelete: false,
        status: "PUBLISHED",
        seoTitle: "Home",
        seoDescription: null,
        updatedAt: "",
        draftRevisionNumber: 1,
        publishedRevisionNumber: 1,
        publishedAt: "",
        lineage: {
          sourceTemplateKey: "agency-starter",
          sourceTemplateName: "Agency Starter",
          sourceTemplateVersion: "1.0.0",
          sourcePageBlueprintKey: "home",
          status: "INHERITED",
          isTracked: true,
        },
        hierarchy: {
          role: "MAIN",
          defaultParentPageKey: null,
          defaultParentTitle: null,
          defaultParentSlug: null,
        },
      },
    ]);
    vi.mocked(createAdminPreviewToken).mockResolvedValue({
      id: "preview-1",
      pageKey: "home",
      expiresAt: "2026-04-07T12:00:00.000Z",
      revokedAt: null,
      note: null,
      createdAt: "2026-04-07T11:00:00.000Z",
      token: "raw-token",
      previewUrl: "http://localhost:5174/preview/pages/home?token=raw-token",
    });
    vi.mocked(createAdminDomain).mockResolvedValue({
      id: "domain-created",
      hostname: "studio.dsgnfi.test",
      type: "SUBDOMAIN",
      isPrimary: true,
      verificationStatus: "VERIFIED",
      verifiedAt: "2026-04-07T11:00:00.000Z",
      verificationInstructions: null,
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(setPrimaryAdminDomain).mockRejectedValue(
      new Error("Custom domains must be verified before they can be primary.")
    );
    vi.mocked(updateAdminSiteSettings).mockImplementation(async (input) => ({
      site: { id: "site-1", name: input.siteName, slug: "main" },
      settings: {
        siteName: input.siteName,
        logoUrl: input.logoUrl,
        faviconUrl: input.faviconUrl,
        tagline: input.tagline,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        address: input.address,
        socialLinks: input.socialLinks,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        locale: input.locale,
        timezone: input.timezone,
      },
      theme: input.theme,
      pages: [],
      navigation: { primary: [], footer: [] },
    }));
  });

  it("loads and saves site settings", async () => {
    render(
      <MemoryRouter>
        <SiteSettingsAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAdminSiteSettings).toHaveBeenCalled();
    });

    fireEvent.change(await screen.findByDisplayValue("Main Site"), {
      target: { value: "Updated Site" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => {
      expect(updateAdminSiteSettings).toHaveBeenCalled();
    });

    expect(vi.mocked(updateAdminSiteSettings).mock.calls[0]?.[0].siteName).toBe("Updated Site");
  });

  it("shows blocked primary action for unverified custom domains", async () => {
    render(
      <MemoryRouter>
        <SiteSettingsAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAdminSiteSettings).toHaveBeenCalled();
    });

    await screen.findByDisplayValue("Main Site");
    fireEvent.click(screen.getByRole("button", { name: "Domains" }));

    expect(
      await screen.findByText("Custom domains must be verified before they can become primary.")
    ).toBeInTheDocument();
  });

  it("creates a preview link and shows the generated url", async () => {
    render(
      <MemoryRouter>
        <SiteSettingsAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAdminSiteSettings).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Create preview link" }));

    await waitFor(() => {
      expect(createAdminPreviewToken).toHaveBeenCalled();
    });

    expect(
      await screen.findByText("http://localhost:5174/preview/pages/home?token=raw-token")
    ).toBeInTheDocument();
  });

  it("shows the resolved slug for a linked navigation page", async () => {
    vi.mocked(listAdminPages).mockResolvedValue([
      {
        id: "page-home",
        pageKey: "home",
        title: "Home",
        slug: "/",
        isVisible: true,
        isRequired: true,
        canDelete: false,
        status: "PUBLISHED",
        seoTitle: "Home",
        seoDescription: null,
        updatedAt: "",
        draftRevisionNumber: 1,
        publishedRevisionNumber: 1,
        publishedAt: "",
        lineage: {
          sourceTemplateKey: "agency-starter",
          sourceTemplateName: "Agency Starter",
          sourceTemplateVersion: "1.0.0",
          sourcePageBlueprintKey: "home",
          status: "INHERITED",
          isTracked: true,
        },
        hierarchy: {
          role: "MAIN",
          defaultParentPageKey: null,
          defaultParentTitle: null,
          defaultParentSlug: null,
        },
      },
      {
        id: "page-studio",
        pageKey: "studio-profile",
        title: "Studio Profile",
        slug: "/studio-profile",
        isVisible: true,
        isRequired: false,
        canDelete: true,
        status: "DRAFT",
        seoTitle: "Studio Profile",
        seoDescription: null,
        updatedAt: "",
        draftRevisionNumber: 1,
        publishedRevisionNumber: null,
        publishedAt: null,
        lineage: {
          sourceTemplateKey: null,
          sourceTemplateName: null,
          sourceTemplateVersion: null,
          sourcePageBlueprintKey: null,
          status: "UNTRACKED",
          isTracked: false,
        },
        hierarchy: {
          role: "MAIN",
          defaultParentPageKey: null,
          defaultParentTitle: null,
          defaultParentSlug: null,
        },
      },
    ]);
    vi.mocked(getAdminSiteNavigation).mockResolvedValue({
      primary: [
        {
          id: "nav-1",
          label: "Studio",
          pageKey: "studio-profile",
          href: null,
          visible: true,
          order: 0,
        },
      ],
      footer: [],
    });

    render(
      <MemoryRouter>
        <SiteSettingsAdmin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Navigation" }));

    expect(await screen.findByDisplayValue("/studio-profile")).toBeDisabled();
  });
});
