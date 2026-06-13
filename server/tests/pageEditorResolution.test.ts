import { describe, expect, it, vi } from "vitest";

import {
  CANONICAL_LEGACY_HOME_EDITOR_ROUTE,
  getLegacyPageCompatibilityDetails,
  PAGE_EDITOR_CONTENT_MODE,
  resolvePageEditorState,
} from "../src/services/pageEditorResolution";

function createPrismaMock(overrides?: {
  siteFindFirst?: ReturnType<typeof vi.fn>;
  pageFindUnique?: ReturnType<typeof vi.fn>;
  cmsSectionFindMany?: ReturnType<typeof vi.fn>;
}) {
  return {
    site: {
      findFirst: overrides?.siteFindFirst ?? vi.fn().mockResolvedValue({ id: "site-1" }),
    },
    page: {
      findUnique: overrides?.pageFindUnique ?? vi.fn().mockResolvedValue(null),
    },
    cmsSection: {
      findMany: overrides?.cmsSectionFindMany ?? vi.fn().mockResolvedValue([]),
    },
  } as any;
}

function makeLegacySection(
  section: string,
  overrides?: Partial<{
    status: "DRAFT" | "PUBLISHED";
    publishedAt: Date | null;
    draftData: unknown;
    publishedData: unknown;
  }>
) {
  return {
    section,
    status: overrides?.status ?? "DRAFT",
    publishedAt: overrides?.publishedAt ?? null,
    draftData: overrides?.draftData ?? { visible: true },
    publishedData: overrides?.publishedData ?? null,
  };
}

describe("pageEditorResolution", () => {
  it("prefers the legacy editor for home when only legacy compatibility content exists", async () => {
    const prisma = createPrismaMock({
      cmsSectionFindMany: vi.fn().mockResolvedValue([
        makeLegacySection("hero", { status: "PUBLISHED", publishedAt: new Date("2026-06-10T10:00:00.000Z") }),
      ]),
    });

    const result = await resolvePageEditorState({
      prisma,
      siteId: "site-1",
      pageKey: "home",
      page: {
        id: "page-home",
        siteId: "site-1",
        pageKey: "home",
        pageTemplateKey: "home",
        status: "DRAFT",
        slug: "/",
        title: "Home",
        lineageStatus: "INHERITED",
        currentDraftRevision: {
          revisionNumber: 1,
          content: {
            blocks: [
              {
                id: "hero-1",
                type: "hero",
                data: { headline: "Default headline" },
              },
            ],
          },
        },
        currentPublishedRevision: null,
        sourceTemplate: {
          sourceType: "STARTER",
        },
      },
      pageDefinition: {
        defaultBlocks: [
          {
            id: "hero-1",
            type: "hero",
            data: { headline: "Default headline" },
          },
        ],
      },
    });

    expect(result.preferredEditor).toBe("LEGACY");
    expect(result.editorRoute).toBe(CANONICAL_LEGACY_HOME_EDITOR_ROUTE);
    expect(result.contentMode).toBe(PAGE_EDITOR_CONTENT_MODE.LEGACY_ONLY);
    expect(result.legacyEditorRoute).toBe(CANONICAL_LEGACY_HOME_EDITOR_ROUTE);
  });

  it("prefers the block editor for home when legacy content and meaningful modern content coexist", async () => {
    const prisma = createPrismaMock({
      cmsSectionFindMany: vi.fn().mockResolvedValue([
        makeLegacySection("hero", { status: "PUBLISHED", publishedAt: new Date("2026-06-10T10:00:00.000Z") }),
      ]),
    });

    const result = await resolvePageEditorState({
      prisma,
      siteId: "site-1",
      pageKey: "home",
      page: {
        id: "page-home",
        siteId: "site-1",
        pageKey: "home",
        pageTemplateKey: "home",
        status: "PUBLISHED",
        slug: "/",
        title: "Home",
        lineageStatus: "MODIFIED",
        currentDraftRevision: {
          revisionNumber: 2,
          content: {
            blocks: [
              {
                id: "hero-1",
                type: "hero",
                data: { headline: "Updated headline" },
              },
            ],
          },
        },
        currentPublishedRevision: {
          revisionNumber: 2,
          content: {
            blocks: [
              {
                id: "hero-1",
                type: "hero",
                data: { headline: "Updated headline" },
              },
            ],
          },
        },
        sourceTemplate: {
          sourceType: "STARTER",
        },
      },
      pageDefinition: {
        defaultBlocks: [
          {
            id: "hero-1",
            type: "hero",
            data: { headline: "Default headline" },
          },
        ],
      },
    });

    expect(result.preferredEditor).toBe("BLOCK");
    expect(result.editorRoute).toBe("/admin/pages/home");
    expect(result.contentMode).toBe(PAGE_EDITOR_CONTENT_MODE.MIXED);
    expect(result.legacyEditorRoute).toBe(CANONICAL_LEGACY_HOME_EDITOR_ROUTE);
  });

  it("ignores unrelated cms sections when computing legacy compatibility", async () => {
    const prisma = createPrismaMock({
      cmsSectionFindMany: vi.fn().mockResolvedValue([
        makeLegacySection("randomBanner", { status: "PUBLISHED", publishedAt: new Date("2026-06-10T10:00:00.000Z") }),
      ]),
    });

    const compatibility = await getLegacyPageCompatibilityDetails(prisma, {
      siteId: "site-1",
      pageKey: "home",
    });

    expect(compatibility.status).toBe("NONE");
    expect(compatibility.hasLegacyCmsContent).toBe(false);
  });

  it("rejects tenant-scope mismatches before resolving editor state", async () => {
    const prisma = createPrismaMock({
      siteFindFirst: vi.fn().mockResolvedValue(null),
    });

    await expect(
      resolvePageEditorState({
        prisma,
        siteId: "site-1",
        tenantId: "tenant-1",
        pageKey: "home",
      })
    ).rejects.toThrow("Requested page is outside the active tenant scope.");
  });
});
