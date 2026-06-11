import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Navigation } from "./Navigation";
import { PublicSiteProvider } from "../site/PublicSiteContext";
import { getPublicSite } from "../services/siteSettings";

vi.mock("../services/siteSettings", () => ({
  getPublicSite: vi.fn(),
}));

describe("Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders public navigation from the site API", async () => {
    vi.mocked(getPublicSite).mockResolvedValue({
      site: { id: "site-1", name: "Main Site", slug: "main" },
      settings: {
        siteName: "Main Site",
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
      theme: { primaryColor: "#123456" },
      pages: [
        {
          pageKey: "work",
          title: "Work",
          slug: "/work",
          hierarchy: {
            role: "MAIN",
            defaultParentPageKey: null,
            defaultParentTitle: null,
            defaultParentSlug: null,
          },
        },
        {
          pageKey: "process",
          title: "Process",
          slug: "/process",
          hierarchy: {
            role: "MAIN",
            defaultParentPageKey: null,
            defaultParentTitle: null,
            defaultParentSlug: null,
          },
        },
      ],
      navigation: {
        primary: [
          {
            id: "nav-1",
            label: "Work",
            pageKey: "work",
            href: "/work",
            visible: true,
            order: 0,
          },
          {
            id: "nav-2",
            label: "Process",
            pageKey: "process",
            href: "/process",
            visible: true,
            order: 1,
          },
        ],
        footer: [],
      },
    });

    render(
      <MemoryRouter initialEntries={["/?site=branch"]}>
        <PublicSiteProvider>
          <Navigation />
        </PublicSiteProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Main Site")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Work").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Process").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Main Site" })).toHaveAttribute(
      "href",
      "/?site=branch"
    );
  });
});
