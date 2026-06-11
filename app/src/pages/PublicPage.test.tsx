import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicPage } from "./PublicPage";
import { getPublicPageBySlug } from "../services/siteSettings";
import { PublicSiteValueProvider } from "../site/PublicSiteContext";

vi.mock("../services/siteSettings", () => ({
  getPublicPageBySlug: vi.fn(),
}));

describe("PublicPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a published template-approved page by slug", async () => {
    vi.mocked(getPublicPageBySlug).mockResolvedValue({
      pageKey: "custom__team",
      title: "Team",
      slug: "/team",
      seoTitle: "Team",
      seoDescription: null,
      status: "PUBLISHED",
      publishedAt: "2026-05-14T10:00:00.000Z",
      revisionNumber: 2,
      hierarchy: {
        role: "MAIN",
        defaultParentPageKey: null,
        defaultParentTitle: null,
        defaultParentSlug: null,
      },
      content: {
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            data: {
              headline: "Meet the team",
              subheadline: "The people behind the work.",
            },
          },
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={["/team"]}>
        <PublicSiteValueProvider
          presentation={{
            site: {
              id: "site-1",
              name: "Team Site",
              slug: "team-site",
            },
            settings: {
              siteName: "Team Site",
              logoUrl: null,
              faviconUrl: null,
              tagline: null,
              contactEmail: null,
              contactPhone: null,
              address: null,
              socialLinks: {},
              seoTitle: null,
              seoDescription: null,
              locale: null,
              timezone: null,
            },
            theme: {},
            pages: [
              {
                pageKey: "custom__team",
                title: "Team",
                slug: "/team",
                hierarchy: {
                  role: "MAIN",
                  defaultParentPageKey: null,
                  defaultParentTitle: null,
                  defaultParentSlug: null,
                },
              },
            ],
            navigation: {
              primary: [],
              footer: [],
            },
          }}
        >
          <Routes>
            <Route path="*" element={<PublicPage />} />
          </Routes>
        </PublicSiteValueProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getPublicPageBySlug).toHaveBeenCalledWith("/team");
    });

    expect(await screen.findByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Meet the team")).toBeInTheDocument();
  });
});
