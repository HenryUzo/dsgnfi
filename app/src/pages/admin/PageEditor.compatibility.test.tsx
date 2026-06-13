import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PageEditor } from "./PageEditor";
import { useAdmin } from "../../auth/useAdmin";
import {
  getAdminPageDraft,
  listAdminAssets,
  listAdminPages,
  publishAdminPage,
  saveAdminPageDraft,
  uploadAdminAsset,
} from "../../services/siteSettings";
import {
  deletePagePrefillBrief,
  getLatestPagePrefillReview,
  getPagePrefillSuggestions,
  recordPagePrefillApplied,
  recordPagePrefillRejected,
  uploadPagePrefillArtifacts,
} from "../../services/adminPagePrefill";

vi.mock("../../auth/useAdmin", () => ({
  useAdmin: vi.fn(),
}));

vi.mock("../../services/siteSettings", () => ({
  getAdminPageDraft: vi.fn(),
  listAdminAssets: vi.fn(),
  listAdminPages: vi.fn(),
  publishAdminPage: vi.fn(),
  saveAdminPageDraft: vi.fn(),
  uploadAdminAsset: vi.fn(),
}));

vi.mock("../../services/adminPagePrefill", () => ({
  deletePagePrefillBrief: vi.fn(),
  getLatestPagePrefillReview: vi.fn(),
  getPagePrefillSuggestions: vi.fn(),
  recordPagePrefillApplied: vi.fn(),
  recordPagePrefillRejected: vi.fn(),
  uploadPagePrefillArtifacts: vi.fn(),
}));

describe("PageEditor compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const pageDraft = {
      id: "page-home",
      pageKey: "home",
      pageTemplateKey: "home",
      title: "Home",
      slug: "/",
      isVisible: true,
      isRequired: true,
      canDelete: false,
      status: "DRAFT" as const,
      modernStatus: "DRAFT" as const,
      legacyStatus: "PUBLISHED" as const,
      seoTitle: "Home",
      seoDescription: "Homepage",
      updatedAt: "2026-06-12T00:00:00.000Z",
      draftRevisionNumber: 1,
      publishedRevisionNumber: null,
      publishedAt: null,
      lineage: {
        sourceTemplateKey: "agency-starter",
        sourceTemplateName: "Agency Starter",
        sourceTemplateVersion: "1.0.0",
        sourcePageBlueprintKey: "home",
        status: "INHERITED" as const,
        isTracked: true,
      },
      hierarchy: {
        role: "MAIN" as const,
        defaultParentPageKey: null,
        defaultParentTitle: null,
        defaultParentSlug: null,
      },
      editorResolution: {
        hasModernPage: true,
        hasModernDraft: true,
        hasModernPublishedRevision: false,
        hasLegacyCmsContent: true,
        hasPublishedLegacyContent: true,
        preferredEditor: "BLOCK" as const,
        editorRoute: "/admin/pages/home",
        legacyEditorRoute: "/admin/legacy/home",
        contentMode: "MIXED" as const,
        compatibilityReason: "MODERN_AND_LEGACY_COEXIST" as const,
        migrationAvailable: true,
      },
      allowedBlockTypes: ["hero"],
      content: {
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            data: {
              headline: "Hello",
              subheadline: "World",
              primaryCtaLabel: "Contact",
              primaryCtaHref: "/contact",
            },
          },
        ],
      },
    };

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

    vi.mocked(getAdminPageDraft).mockResolvedValue(pageDraft);
    vi.mocked(listAdminAssets).mockResolvedValue([]);
    vi.mocked(listAdminPages).mockResolvedValue([]);
    vi.mocked(getLatestPagePrefillReview).mockResolvedValue(null);
    vi.mocked(publishAdminPage).mockResolvedValue(pageDraft);
    vi.mocked(saveAdminPageDraft).mockResolvedValue(pageDraft);
    vi.mocked(uploadAdminAsset).mockRejectedValue(new Error("not used"));
    vi.mocked(uploadPagePrefillArtifacts).mockRejectedValue(new Error("not used"));
    vi.mocked(getPagePrefillSuggestions).mockRejectedValue(new Error("not used"));
    vi.mocked(recordPagePrefillApplied).mockRejectedValue(new Error("not used"));
    vi.mocked(recordPagePrefillRejected).mockRejectedValue(new Error("not used"));
    vi.mocked(deletePagePrefillBrief).mockRejectedValue(new Error("not used"));
  });

  it("shows the mixed-content compatibility banner and legacy-editor link", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/pages/home"]}>
        <Routes>
          <Route path="/admin/pages/:pageKey" element={<PageEditor />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Legacy homepage sections still exist.")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/both block-based and legacy section content/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open legacy editor" })).toHaveAttribute(
      "href",
      "/admin/legacy/home"
    );
  });
});
