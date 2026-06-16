import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyLegacyHomeMigrationPreview,
  generateLegacyHomeMigrationPreview,
  isLegacyMigrationSourceChangedError,
  legacyHomeMigrationBlockValidators,
} from "../src/services/legacyHomeMigration";
import { getAdminPageDraft, saveAdminPageDraft } from "../src/services/pageAdmin";

vi.mock("../src/services/pageAdmin", () => ({
  getAdminPageDraft: vi.fn(),
  saveAdminPageDraft: vi.fn(),
}));

function buildPrisma(overrides?: {
  siteFound?: boolean;
  cmsSections?: Array<Record<string, unknown>>;
  workProjects?: Array<Record<string, unknown>>;
}) {
  return {
    site: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.siteFound === false ? null : { id: "site-1" }
      ),
    },
    cmsSection: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.cmsSections ?? [
          {
            siteId: "site-1",
            page: "home",
            section: "hero",
            status: "PUBLISHED",
            draftData: {
              headline: "Legacy headline",
              subheadline: "Legacy subheadline",
              backgroundImageUrl: "/legacy-hero.jpg",
              visible: true,
            },
            publishedData: {},
            updatedAt: new Date("2026-06-10T10:00:00.000Z"),
            publishedAt: new Date("2026-06-10T10:00:00.000Z"),
          },
          {
            siteId: "site-1",
            page: "home",
            section: "services",
            status: "DRAFT",
            draftData: {
              introTitle: "Services",
              introText: "Strategy and creative execution.",
              visible: true,
              categories: [
                { title: "Strategy", items: ["Brand strategy", "Content planning"] },
                { title: "Design", items: ["Identity systems", "Campaign creative"] },
              ],
            },
            publishedData: {},
            updatedAt: new Date("2026-06-10T10:05:00.000Z"),
            publishedAt: null,
          },
          {
            siteId: "site-1",
            page: "home",
            section: "featuredWork",
            status: "DRAFT",
            draftData: {
              title: "Featured work",
              description: "Selected projects",
              count: 2,
              order: "manual",
              manualSlugs: ["echoes-installation"],
            },
            publishedData: {},
            updatedAt: new Date("2026-06-10T10:10:00.000Z"),
            publishedAt: null,
          },
          {
            siteId: "site-1",
            page: "home",
            section: "faq",
            status: "DRAFT",
            draftData: {
              visible: true,
              items: [{ question: "How do you work?", answer: "Closely with the client team." }],
            },
            publishedData: {},
            updatedAt: new Date("2026-06-10T10:15:00.000Z"),
            publishedAt: null,
          },
          {
            siteId: "site-1",
            page: "home",
            section: "cta",
            status: "DRAFT",
            draftData: {
              visible: true,
              title: "Start your next project",
              primaryLabel: "Contact us",
              primaryHref: "/contact",
              secondaryLabel: "View work",
              secondaryHref: "/work",
            },
            publishedData: {},
            updatedAt: new Date("2026-06-10T10:20:00.000Z"),
            publishedAt: null,
          },
          {
            siteId: "site-1",
            page: "home",
            section: "testimonials",
            status: "DRAFT",
            draftData: {
              visible: true,
              title: "Client feedback",
              items: [{ quote: "Sharp work.", author: "Ada", role: "Founder" }],
            },
            publishedData: {},
            updatedAt: new Date("2026-06-10T10:25:00.000Z"),
            publishedAt: null,
          },
          {
            siteId: "site-1",
            page: "home",
            section: "awards",
            status: "DRAFT",
            draftData: {
              visible: true,
              eyebrow: "Awards",
              title: "Recognition",
              listTitle: "Latest awards",
              items: [{ year: "2025", title: "Gold", org: "Awwwards" }],
            },
            publishedData: {},
            updatedAt: new Date("2026-06-10T10:30:00.000Z"),
            publishedAt: null,
          },
        ]
      ),
    },
    workProject: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.workProjects ?? [
          {
            id: "project-1",
            slugDraft: "echoes-installation",
            titleDraft: "Echoes Installation",
            excerptDraft: "Immersive responsive installation.",
            coverImageDraft: "/echoes.jpg",
            createdAt: new Date("2026-06-01T00:00:00.000Z"),
            publishedAt: new Date("2026-06-05T00:00:00.000Z"),
            updatedAt: new Date("2026-06-06T00:00:00.000Z"),
            tags: [{ tag: { name: "Installation", slug: "installation" } }],
          },
        ]
      ),
    },
  };
}

function buildGenericPageDraft() {
  return {
    id: "page-home",
    pageKey: "home",
    title: "Home",
    slug: "/",
    seoTitle: "Home",
    seoDescription: "Homepage",
    updatedAt: "2026-06-10T00:00:00.000Z",
    draftRevisionNumber: 1,
    allowedBlockTypes: ["hero", "features", "gallery", "faq", "cta", "richText", "stats"],
    content: {
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          data: {
            headline: "Old headline",
            subheadline: "Old subheadline",
            primaryCtaLabel: "Contact",
            primaryCtaHref: "/contact",
          },
        },
        { id: "features-1", type: "features", data: { heading: "Old services", items: [] } },
        { id: "gallery-1", type: "gallery", data: { heading: "Old work", items: [] } },
        { id: "faq-1", type: "faq", data: { heading: "Old FAQ", items: [] } },
        { id: "cta-1", type: "cta", data: { title: "Old CTA" } },
        { id: "rich-1", type: "richText", data: { title: "Old testimonials", body: "" } },
        { id: "stats-1", type: "stats", data: { heading: "Old awards", items: [] } },
      ],
    },
  };
}

function buildBlitPageDraft() {
  return {
    id: "page-blit-home",
    pageKey: "home",
    title: "Blit Home",
    slug: "/",
    seoTitle: "Blit Home",
    seoDescription: "Blit homepage",
    updatedAt: "2026-06-10T00:00:00.000Z",
    draftRevisionNumber: 2,
    publishedRevisionNumber: 1,
    allowedBlockTypes: [
      "blitHeroCollage",
      "blitFeaturedWork",
      "blitEditorialStatement",
      "blitVideoSection",
      "blitCapabilitiesGrid",
      "blitHorizontalGallery",
      "blitFinalStatement",
    ],
    content: {
      blocks: [
        {
          id: "blit-home-hero",
          type: "blitHeroCollage",
          data: {
            eyebrow: "Blit",
            headline: "Current headline",
            caption: "Current caption",
            images: [{ imageUrl: "/existing-hero.jpg", alt: "Existing hero" }],
          },
        },
        {
          id: "blit-home-featured",
          type: "blitFeaturedWork",
          data: {
            heading: "featured work",
            title: "Current featured",
            ctaLabel: "See works",
            ctaHref: "/works",
            projects: [
              {
                title: "Current featured project",
                category: "Installation",
                year: "2026",
                description: "Existing project",
                image: "/featured.jpg",
                href: "/work/current",
                location: "Lagos",
              },
            ],
          },
        },
        {
          id: "blit-home-editorial",
          type: "blitEditorialStatement",
          data: {
            eyebrow: "statement",
            title: "Current editorial",
            body: "Current editorial body",
          },
        },
        {
          id: "blit-home-video",
          type: "blitVideoSection",
          data: {
            title: "Current showreel",
            videoUrl: "/showreel.mp4",
          },
        },
        {
          id: "blit-home-capabilities",
          type: "blitCapabilitiesGrid",
          data: {
            heading: "capabilities",
            imageUrl: "/capabilities.jpg",
            items: [
              {
                title: "Existing capability",
                description: "Existing description",
                imageUrl: "/capability.jpg",
                imageAlt: "Capability",
              },
            ],
          },
        },
        {
          id: "blit-home-gallery",
          type: "blitHorizontalGallery",
          data: {
            heading: "selected moments",
            projects: [
              {
                title: "Existing gallery card",
                subtitle: "Existing subtitle",
                image: "/gallery.jpg",
                href: "/works#existing",
              },
            ],
          },
        },
        {
          id: "blit-home-final",
          type: "blitFinalStatement",
          data: { title: "Current final statement" },
        },
      ],
    },
  };
}

describe("legacyHomeMigration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminPageDraft).mockResolvedValue(buildGenericPageDraft() as never);
    vi.mocked(saveAdminPageDraft).mockResolvedValue({
      type: "success",
      page: {
        ...buildGenericPageDraft(),
        updatedAt: "2026-06-12T09:00:00.000Z",
        draftRevisionNumber: 2,
      },
    } as never);
  });

  it("generates a generic homepage migration preview from supported legacy sections", async () => {
    const prisma = buildPrisma();
    const result = await generateLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
    });

    expect(result.type).toBe("success");
    if (result.type !== "success") {
      return;
    }

    expect(result.preview.summary.mappedSections).toBe(7);
    expect(result.preview.supportedMappings.map((entry) => entry.targetBlockType)).toEqual([
      "hero",
      "features",
      "gallery",
      "faq",
      "cta",
      "richText",
      "stats",
    ]);
    expect(result.preview.proposedContent.blocks.find((block) => block.id === "hero-1")?.data)
      .toMatchObject({
        headline: "Legacy headline",
        subheadline: "Legacy subheadline",
        backgroundImage: "/legacy-hero.jpg",
      });
    expect(result.preview.proposedContent.blocks.find((block) => block.id === "gallery-1")?.data)
      .toMatchObject({
        heading: "Featured work",
      });
    expect(saveAdminPageDraft).not.toHaveBeenCalled();
  });

  it("reports unsupported sections when the target template lacks matching block types", async () => {
    vi.mocked(getAdminPageDraft).mockResolvedValue({
      ...buildGenericPageDraft(),
      allowedBlockTypes: ["hero"],
      content: { blocks: [{ id: "hero-1", type: "hero", data: {} }] },
    } as never);

    const prisma = buildPrisma();
    const result = await generateLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
    });

    expect(result.type).toBe("success");
    if (result.type !== "success") {
      return;
    }

    expect(result.preview.summary.mappedSections).toBe(1);
    expect(result.preview.unsupportedItems.some((item) => item.sourceSectionKey === "services")).toBe(
      true
    );
    expect(result.preview.summary.hasBlockingIssues).toBe(false);
  });

  it("returns not_found when tenant/site scope does not resolve", async () => {
    const prisma = buildPrisma({ siteFound: false });
    const result = await generateLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-2",
      siteId: "site-1",
    });

    expect(result.type).toBe("not_found");
  });

  it("applies a preview only through the draft save path", async () => {
    const prisma = buildPrisma();
    const previewResult = await generateLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
    });
    expect(previewResult.type).toBe("success");
    if (previewResult.type !== "success") {
      return;
    }

    const result = await applyLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
      adminId: "admin-1",
      sourceFingerprint: previewResult.preview.sourceFingerprint,
      proposedContent: previewResult.preview.proposedContent,
    });

    expect(result.type).toBe("success");
    expect(saveAdminPageDraft).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveAdminPageDraft).mock.calls[0]?.[1]).toMatchObject({
      pageKey: "home",
      adminId: "admin-1",
      payload: {
        title: "Home",
        slug: "/",
      },
    });
  });

  it("rejects stale previews when legacy source content changes", async () => {
    const prisma = buildPrisma();
    const previewResult = await generateLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
    });
    expect(previewResult.type).toBe("success");
    if (previewResult.type !== "success") {
      return;
    }

    prisma.cmsSection.findMany.mockResolvedValueOnce([
      {
        siteId: "site-1",
        page: "home",
        section: "hero",
        status: "PUBLISHED",
        draftData: {
          headline: "Changed after preview",
          subheadline: "Updated",
          visible: true,
        },
        publishedData: {},
        updatedAt: new Date("2026-06-12T10:00:00.000Z"),
        publishedAt: new Date("2026-06-12T10:00:00.000Z"),
      },
    ]);

    await expect(
      applyLegacyHomeMigrationPreview(prisma as never, {
        tenantId: "tenant-1",
        siteId: "site-1",
        adminId: "admin-1",
        sourceFingerprint: previewResult.preview.sourceFingerprint,
        proposedContent: previewResult.preview.proposedContent,
      })
    ).rejects.toSatisfy((error: unknown) => isLegacyMigrationSourceChangedError(error));
  });

  it("rejects invalid proposed blocks instead of saving them", async () => {
    const prisma = buildPrisma();
    const previewResult = await generateLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
    });
    expect(previewResult.type).toBe("success");
    if (previewResult.type !== "success") {
      return;
    }

    const result = await applyLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
      adminId: "admin-1",
      sourceFingerprint: previewResult.preview.sourceFingerprint,
      proposedContent: {
        blocks: [
          ...previewResult.preview.proposedContent.blocks,
          { id: "bad-1", type: "unknownBlock", data: {} },
        ],
      },
    });

    expect(result.type).toBe("validation_error");
    expect(saveAdminPageDraft).not.toHaveBeenCalled();
  });

  it("applies a Blit preview that carries forward video and horizontal gallery blocks", async () => {
    vi.mocked(getAdminPageDraft).mockResolvedValue(buildBlitPageDraft() as never);
    vi.mocked(saveAdminPageDraft).mockResolvedValue({
      type: "success",
      page: {
        ...buildBlitPageDraft(),
        updatedAt: "2026-06-12T09:00:00.000Z",
        draftRevisionNumber: 3,
      },
    } as never);

    const prisma = buildPrisma();
    const previewResult = await generateLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
    });
    expect(previewResult.type).toBe("success");
    if (previewResult.type !== "success") {
      return;
    }

    expect(previewResult.preview.proposedContent.blocks.map((block) => block.type)).toEqual([
      "blitHeroCollage",
      "blitFeaturedWork",
      "blitEditorialStatement",
      "blitVideoSection",
      "blitCapabilitiesGrid",
      "blitHorizontalGallery",
      "blitFinalStatement",
    ]);

    const result = await applyLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
      adminId: "admin-1",
      sourceFingerprint: previewResult.preview.sourceFingerprint,
      proposedContent: previewResult.preview.proposedContent,
    });

    expect(result.type).toBe("success");
    expect(saveAdminPageDraft).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveAdminPageDraft).mock.calls[0]?.[1]).toMatchObject({
      pageKey: "home",
      adminId: "admin-1",
      payload: {
        title: "Blit Home",
        slug: "/",
        content: {
          blocks: expect.arrayContaining([
            expect.objectContaining({
              id: "blit-home-video",
              type: "blitVideoSection",
              data: { title: "Current showreel", videoUrl: "/showreel.mp4" },
            }),
            expect.objectContaining({
              id: "blit-home-gallery",
              type: "blitHorizontalGallery",
              data: {
                heading: "selected moments",
                projects: [
                  {
                    title: "Existing gallery card",
                    subtitle: "Existing subtitle",
                    image: "/gallery.jpg",
                    href: "/works#existing",
                  },
                ],
              },
            }),
          ]),
        },
      },
    });
  });

  it("rejects invalid Blit video section data", async () => {
    vi.mocked(getAdminPageDraft).mockResolvedValue(buildBlitPageDraft() as never);
    const prisma = buildPrisma();
    const previewResult = await generateLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
    });
    expect(previewResult.type).toBe("success");
    if (previewResult.type !== "success") {
      return;
    }

    const invalidBlocks = previewResult.preview.proposedContent.blocks.map((block) =>
      block.type === "blitVideoSection"
        ? {
            ...block,
            data: {
              ...block.data,
              videoUrl: ["invalid"],
            },
          }
        : block
    );

    const result = await applyLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
      adminId: "admin-1",
      sourceFingerprint: previewResult.preview.sourceFingerprint,
      proposedContent: { blocks: invalidBlocks },
    });

    expect(result.type).toBe("validation_error");
    expect(saveAdminPageDraft).not.toHaveBeenCalled();
  });

  it("rejects invalid Blit horizontal gallery data", async () => {
    vi.mocked(getAdminPageDraft).mockResolvedValue(buildBlitPageDraft() as never);
    const prisma = buildPrisma();
    const previewResult = await generateLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
    });
    expect(previewResult.type).toBe("success");
    if (previewResult.type !== "success") {
      return;
    }

    const invalidBlocks = previewResult.preview.proposedContent.blocks.map((block) =>
      block.type === "blitHorizontalGallery"
        ? {
            ...block,
            data: {
              ...block.data,
              projects: [
                {
                  title: "Broken project",
                  subtitle: "Missing fields",
                  image: ["/broken.jpg"],
                  href: "/broken",
                },
              ],
            },
          }
        : block
    );

    const result = await applyLegacyHomeMigrationPreview(prisma as never, {
      tenantId: "tenant-1",
      siteId: "site-1",
      adminId: "admin-1",
      sourceFingerprint: previewResult.preview.sourceFingerprint,
      proposedContent: { blocks: invalidBlocks },
    });

    expect(result.type).toBe("validation_error");
    expect(saveAdminPageDraft).not.toHaveBeenCalled();
  });

  it("covers every carried-forward Blit homepage block type with a migration validator", () => {
    const blitAllowedBlockTypes = buildBlitPageDraft().allowedBlockTypes;
    expect(blitAllowedBlockTypes.filter((type) => !(type in legacyHomeMigrationBlockValidators))).toEqual(
      []
    );
  });
});
