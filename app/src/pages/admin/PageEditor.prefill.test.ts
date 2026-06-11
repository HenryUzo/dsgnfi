import { describe, expect, it } from "vitest";

import {
  applySelectedPrefillSuggestionsToPage,
} from "./PageEditor";
import type { AdminPagePrefillSuggestion } from "../../services/adminPagePrefill";
import type { AdminPageDetail } from "../../services/siteSettings";

function pageFixture(): AdminPageDetail {
  return {
    id: "page-home",
    pageKey: "home",
    title: "Home",
    slug: "/",
    isVisible: true,
    isRequired: true,
    canDelete: false,
    status: "DRAFT",
    updatedAt: "2026-06-08T00:00:00.000Z",
    draftRevisionNumber: 1,
    publishedRevisionNumber: null,
    publishedAt: null,
    seoTitle: null,
    seoDescription: null,
    lineage: {
      sourceTemplateKey: "blit",
      sourceTemplateName: "Blit",
      sourceTemplateVersion: "1",
      sourcePageBlueprintKey: "home",
      status: "MODIFIED",
      isTracked: true,
    },
    hierarchy: {
      role: "MAIN",
      defaultParentPageKey: null,
      defaultParentTitle: null,
      defaultParentSlug: null,
    },
    allowedBlockTypes: ["blitHeroCollage", "blitFeaturedWork", "blitCapabilitiesGrid", "blitFinalStatement"],
    content: {
      blocks: [
        {
          id: "hero",
          type: "blitHeroCollage",
          data: { eyebrow: "Blit Studio", headline: "Old headline", caption: "Old caption" },
        },
        {
          id: "featured",
          type: "blitFeaturedWork",
          data: {
            heading: "featured work",
            title: "Old featured title",
            projects: [{ title: "Old project", image: "/old.jpg", href: "/old" }],
          },
        },
        {
          id: "capabilities",
          type: "blitCapabilitiesGrid",
          data: { heading: "capabilities", items: [{ title: "Old capability" }] },
        },
        {
          id: "final",
          type: "blitFinalStatement",
          data: { title: "old final" },
        },
      ],
    },
  };
}

describe("applySelectedPrefillSuggestionsToPage", () => {
  it("applies selected suggestions across all matching page blocks", () => {
    const suggestions: AdminPagePrefillSuggestion = {
      analysis: null,
      page: {
        seoTitle: "DSGNFI Studio | Digital Marketing, Brand Design & Web",
        seoDescription: "Strategy-led creative work for clearer brands and modern web experiences.",
      },
      blocks: [
        {
          blockId: "hero",
          blockType: "blitHeroCollage",
          label: "Hero",
          summary: "Hero copy",
          confidence: 0.9,
          notes: null,
          dataPatch: { headline: "clearer brands and modern web experiences" },
        },
        {
          blockId: "featured",
          blockType: "blitFeaturedWork",
          label: "Featured",
          summary: "Featured copy",
          confidence: 0.86,
          notes: null,
          dataPatch: {
            title: "Strategy-led creative services",
            projects: [{ title: "Digital Marketing", image: "/old.jpg", href: "/old" }],
          },
        },
        {
          blockId: "capabilities",
          blockType: "blitCapabilitiesGrid",
          label: "Capabilities",
          summary: "Capability copy",
          confidence: 0.88,
          notes: null,
          dataPatch: { items: [{ title: "Brand Design" }, { title: "Web Development" }] },
        },
        {
          blockId: "final",
          blockType: "blitFinalStatement",
          label: "Final",
          summary: "Final copy",
          confidence: 0.8,
          notes: null,
          dataPatch: { title: "build clarity, visibility, and trust" },
        },
        {
          blockId: "hero",
          blockType: "blitHeroCollage",
          label: "Hero caption",
          summary: "Second hero patch",
          confidence: 0.82,
          notes: null,
          dataPatch: { caption: "Creative digital studio for brand, campaigns, and websites." },
        },
      ],
    };

    const next = applySelectedPrefillSuggestionsToPage(
      pageFixture(),
      suggestions,
      ["seoTitle", "seoDescription"],
      ["hero::0", "featured::1", "capabilities::2", "final::3", "hero::4"]
    );

    expect(next.seoTitle).toBe("DSGNFI Studio | Digital Marketing, Brand Design & Web");
    expect(next.seoDescription).toBe("Strategy-led creative work for clearer brands and modern web experiences.");
    expect(next.content.blocks.find((block) => block.id === "hero")?.data).toMatchObject({
      headline: "clearer brands and modern web experiences",
      caption: "Creative digital studio for brand, campaigns, and websites.",
    });
    expect(next.content.blocks.find((block) => block.id === "featured")?.data).toMatchObject({
      title: "Strategy-led creative services",
    });
    expect(next.content.blocks.find((block) => block.id === "capabilities")?.data).toMatchObject({
      items: [{ title: "Brand Design" }, { title: "Web Development" }],
    });
    expect(next.content.blocks.find((block) => block.id === "final")?.data).toMatchObject({
      title: "build clarity, visibility, and trust",
    });
  });

  it("does not apply unselected suggestions", () => {
    const next = applySelectedPrefillSuggestionsToPage(
      pageFixture(),
      {
        page: {},
        blocks: [
          {
            blockId: "hero",
            blockType: "blitHeroCollage",
            label: "Hero",
            summary: "Hero copy",
            confidence: 0.9,
            notes: null,
            dataPatch: { headline: "New headline" },
          },
          {
            blockId: "final",
            blockType: "blitFinalStatement",
            label: "Final",
            summary: "Final copy",
            confidence: 0.8,
            notes: null,
            dataPatch: { title: "new final" },
          },
        ],
      },
      [],
      ["hero::0"]
    );

    expect(next.content.blocks.find((block) => block.id === "hero")?.data.headline).toBe("New headline");
    expect(next.content.blocks.find((block) => block.id === "final")?.data.title).toBe("old final");
  });
});
