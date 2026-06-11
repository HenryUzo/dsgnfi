import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PreviewPage } from "./PreviewPage";
import { getPublicPreviewPage } from "../services/siteSettings";

vi.mock("../services/siteSettings", () => ({
  getPublicPreviewPage: vi.fn(),
}));

vi.mock("../sections/Hero", () => ({
  Hero: () => <div>Preview Hero Section</div>,
}));

vi.mock("../sections/Services", () => ({
  Services: () => <div>Preview Services Section</div>,
}));

vi.mock("../sections/FeaturedWork", () => ({
  FeaturedWork: () => <div>Preview Featured Work Section</div>,
}));

vi.mock("../sections/Awards", () => ({
  Awards: () => <div>Preview Awards Section</div>,
}));

vi.mock("../sections/Testimonials", () => ({
  Testimonials: () => <div>Preview Testimonials Section</div>,
}));

vi.mock("../sections/FAQ", () => ({
  FAQ: () => <div>Preview FAQ Section</div>,
}));

vi.mock("../sections/CTA", () => ({
  CTA: () => <div>Preview CTA Section</div>,
}));

describe("PreviewPage", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      })),
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders preview mode banner for draft content", async () => {
    vi.mocked(getPublicPreviewPage).mockResolvedValue({
      ok: true,
      page: {
        id: "page-about",
        pageKey: "about",
        title: "About Draft",
        slug: "/about",
        status: "DRAFT",
        seoTitle: null,
        seoDescription: null,
        updatedAt: "2026-04-07T11:00:00.000Z",
        revisionNumber: 3,
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
              data: { headline: "Draft headline" },
            },
          ],
        },
      },
      preview: {
        tokenId: "preview-1",
        pageKey: "about",
        expiresAt: "2026-04-07T12:00:00.000Z",
      },
    });

    render(
      <MemoryRouter initialEntries={["/preview/pages/about?token=abc"]}>
        <Routes>
          <Route path="/preview/pages/:pageKey" element={<PreviewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Preview mode")).toBeInTheDocument();
    });

    expect(screen.getByText(/Draft content for/i)).toBeInTheDocument();
    expect(screen.getByText("about")).toBeInTheDocument();
    expect(screen.getByText("Draft headline")).toBeInTheDocument();
  });

  it("renders block-based home previews through the page renderer", async () => {
    vi.mocked(getPublicPreviewPage).mockResolvedValue({
      ok: true,
      presentation: {
        site: {
          id: "site-1",
          name: "Blit QA",
          slug: "blit-qa",
        },
        settings: {
          siteName: "Blit QA",
          logoUrl: null,
          faviconUrl: null,
          tagline: null,
          contactEmail: "qa@example.com",
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
            pageKey: "home",
            title: "Home",
            slug: "/",
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
      },
      page: {
        id: "page-home",
        pageKey: "home",
        title: "Home Draft",
        slug: "",
        status: "DRAFT",
        seoTitle: null,
        seoDescription: null,
        updatedAt: "2026-04-07T11:00:00.000Z",
        revisionNumber: 3,
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
              type: "blitHeroCollage",
              data: { headline: "The bridge between design and technology" },
            },
          ],
        },
      },
      preview: {
        tokenId: "preview-1",
        pageKey: "home",
        expiresAt: "2026-04-07T12:00:00.000Z",
      },
    });

    render(
      <MemoryRouter initialEntries={["/preview/pages/home?token=abc"]}>
        <Routes>
          <Route path="/preview/pages/:pageKey" element={<PreviewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Preview mode")).toBeInTheDocument();
    });

    expect(screen.getByText(/Draft content for/i)).toBeInTheDocument();
    expect(screen.getByText("Draft content for", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("The bridge between design and technology")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact" })).toBeInTheDocument();
  });

  it("renders legacy home sections when no renderable blocks are present", async () => {
    vi.mocked(getPublicPreviewPage).mockResolvedValue({
      ok: true,
      page: {
        id: "page-home",
        pageKey: "home",
        title: "Home Draft",
        slug: "",
        status: "DRAFT",
        seoTitle: null,
        seoDescription: null,
        updatedAt: "2026-04-07T11:00:00.000Z",
        revisionNumber: 3,
        hierarchy: {
          role: "MAIN",
          defaultParentPageKey: null,
          defaultParentTitle: null,
          defaultParentSlug: null,
        },
        content: {
          blocks: [],
        },
      },
      preview: {
        tokenId: "preview-1",
        pageKey: "home",
        expiresAt: "2026-04-07T12:00:00.000Z",
      },
    });

    render(
      <MemoryRouter initialEntries={["/preview/pages/home?token=abc"]}>
        <Routes>
          <Route path="/preview/pages/:pageKey" element={<PreviewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Preview mode")).toBeInTheDocument();
    });

    expect(screen.getByText("Preview Hero Section")).toBeInTheDocument();
    expect(screen.getByText("Preview CTA Section")).toBeInTheDocument();
  });
});
