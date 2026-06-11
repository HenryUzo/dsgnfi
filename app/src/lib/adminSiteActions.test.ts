import { describe, expect, it } from "vitest";

import { getNextStepLabel } from "../components/admin/sites/sitePresentation";
import { getRecommendedSiteAction } from "./adminSiteActions";

describe("adminSiteActions", () => {
  it("recommends assigning a template before anything else", () => {
    expect(
      getRecommendedSiteAction({
        hasSite: true,
        templateAssigned: false,
        brandingComplete: false,
        navigationComplete: false,
        previewGenerated: false,
        publishedPagesCount: 0,
      }).label
    ).toBe("Assign template");
  });

  it("recommends generating a preview after branding and navigation are complete", () => {
    expect(
      getRecommendedSiteAction({
        hasSite: true,
        templateAssigned: true,
        brandingComplete: true,
        navigationComplete: true,
        previewGenerated: false,
        publishedPagesCount: 2,
        draftPagesCount: 0,
      }).label
    ).toBe("Generate preview");
  });

  it("recommends review and publish when draft pages remain", () => {
    expect(
      getRecommendedSiteAction({
        hasSite: true,
        templateAssigned: true,
        brandingComplete: true,
        navigationComplete: true,
        previewGenerated: true,
        publishedPagesCount: 2,
        draftPagesCount: 1,
      }).label
    ).toBe("Review and publish");
  });

  it("keeps the next-step wording aligned with the sites page", () => {
    const site = {
      id: "site-1",
      name: "Main Site",
      slug: "main",
      status: "DRAFT",
      isDefault: false,
      template: {
        id: "tpl-1",
        key: "agency-starter",
        name: "Agency Starter",
        category: "agency",
      },
      templateVersion: null,
      statusSummary: {
        templateAssigned: true,
        brandingReady: false,
        navigationReady: false,
        publishedPagesCount: 0,
        domainReady: false,
        previewReady: false,
        nextAction: "edit_branding" as const,
      },
    };

    expect(getNextStepLabel(site)).toBe(
      getRecommendedSiteAction({
        hasSite: true,
        siteSlug: "main",
        templateAssigned: true,
        brandingComplete: false,
        navigationComplete: false,
        previewGenerated: false,
        publishedPagesCount: 0,
      }).label
    );
  });
});
