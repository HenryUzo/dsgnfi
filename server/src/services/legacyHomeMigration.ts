import { createHash } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

import { getAdminPageDraft, saveAdminPageDraft } from "./pageAdmin";

const HOME_PAGE_KEY = "home";

const legacyHeroSchema = z
  .object({
    headline: z.string().default(""),
    subheadline: z.string().default(""),
    backgroundImageUrl: z.string().optional().default(""),
    backgroundVideoUrl: z.string().optional().default(""),
    visible: z.boolean().optional().default(true),
  })
  .passthrough();

const legacyServicesSchema = z
  .object({
    introTitle: z.string().default(""),
    introText: z.string().default(""),
    visible: z.boolean().optional().default(true),
    categories: z
      .array(
        z
          .object({
            title: z.string().default(""),
            items: z.array(z.string().default("")).default([]),
          })
          .passthrough()
      )
      .default([]),
  })
  .passthrough();

const legacyFeaturedWorkSchema = z
  .object({
    title: z.string().default(""),
    description: z.string().default(""),
    count: z.number().int().min(1).max(6).default(3),
    order: z.enum(["latest", "manual"]).default("latest"),
    manualSlugs: z.array(z.string().default("")).default([]),
  })
  .passthrough();

const legacyFaqSchema = z
  .object({
    visible: z.boolean().optional().default(true),
    items: z
      .array(
        z
          .object({
            question: z.string().default(""),
            answer: z.string().default(""),
          })
          .passthrough()
      )
      .default([]),
  })
  .passthrough();

const legacyCtaSchema = z
  .object({
    visible: z.boolean().optional().default(true),
    title: z.string().default(""),
    primaryLabel: z.string().default(""),
    primaryHref: z.string().default(""),
    secondaryLabel: z.string().default(""),
    secondaryHref: z.string().default(""),
  })
  .passthrough();

const legacyTestimonialsSchema = z
  .object({
    visible: z.boolean().optional().default(true),
    title: z.string().default(""),
    items: z
      .array(
        z
          .object({
            quote: z.string().default(""),
            author: z.string().default(""),
            role: z.string().default(""),
            color: z.string().optional().default(""),
          })
          .passthrough()
      )
      .default([]),
  })
  .passthrough();

const legacyAwardsSchema = z
  .object({
    visible: z.boolean().optional().default(true),
    eyebrow: z.string().default(""),
    title: z.string().default(""),
    listTitle: z.string().default(""),
    items: z
      .array(
        z
          .object({
            year: z.string().default(""),
            title: z.string().default(""),
            org: z.string().default(""),
          })
          .passthrough()
      )
      .default([]),
  })
  .passthrough();

const genericHeroBlockSchema = z.object({
  headline: z.string().default(""),
  subheadline: z.string().default(""),
  backgroundImage: z.string().optional(),
  backgroundImageAlt: z.string().optional(),
  primaryCtaLabel: z.string().optional(),
  primaryCtaHref: z.string().optional(),
  hidden: z.boolean().optional(),
});

const genericFeaturesBlockSchema = z.object({
  heading: z.string().default(""),
  items: z.array(
    z.object({
      title: z.string().default(""),
      description: z.string().default(""),
    })
  ),
  hidden: z.boolean().optional(),
});

const genericFaqBlockSchema = z.object({
  heading: z.string().default(""),
  items: z.array(
    z.object({
      question: z.string().default(""),
      answer: z.string().default(""),
    })
  ),
  hidden: z.boolean().optional(),
});

const genericCtaBlockSchema = z.object({
  title: z.string().default(""),
  body: z.string().optional(),
  label: z.string().optional(),
  href: z.string().optional(),
  secondaryLabel: z.string().optional(),
  secondaryHref: z.string().optional(),
  hidden: z.boolean().optional(),
});

const genericRichTextBlockSchema = z.object({
  title: z.string().default(""),
  body: z.string().default(""),
  hidden: z.boolean().optional(),
});

const genericStatsBlockSchema = z.object({
  heading: z.string().default(""),
  items: z.array(
    z.object({
      label: z.string().default(""),
      value: z.string().default(""),
    })
  ),
  hidden: z.boolean().optional(),
});

const genericGalleryBlockSchema = z.object({
  heading: z.string().default(""),
  items: z.array(
    z.object({
      imageUrl: z.string().default(""),
      alt: z.string().default(""),
      caption: z.string().default(""),
    })
  ),
  hidden: z.boolean().optional(),
});

const blitHeroCollageBlockSchema = z.object({
  eyebrow: z.string().default(""),
  headline: z.string().default(""),
  caption: z.string().default(""),
  images: z.array(
    z.object({
      imageUrl: z.string().default(""),
      alt: z.string().default(""),
    })
  ),
  hidden: z.boolean().optional(),
});

const blitCapabilitiesBlockSchema = z.object({
  heading: z.string().default(""),
  imageUrl: z.string().default(""),
  items: z.array(
    z.object({
      title: z.string().default(""),
      description: z.string().default(""),
      imageUrl: z.string().default(""),
      imageAlt: z.string().default(""),
    })
  ),
  hidden: z.boolean().optional(),
});

const blitFeaturedWorkBlockSchema = z.object({
  heading: z.string().default(""),
  title: z.string().default(""),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  projects: z.array(
    z.object({
      title: z.string().default(""),
      category: z.string().default(""),
      year: z.string().default(""),
      description: z.string().default(""),
      image: z.string().default(""),
      href: z.string().default(""),
      location: z.string().optional(),
    })
  ),
  hidden: z.boolean().optional(),
});

const blitEditorialBlockSchema = z.object({
  eyebrow: z.string().default(""),
  title: z.string().default(""),
  body: z.string().default(""),
  hidden: z.boolean().optional(),
});

const blitVideoSectionBlockSchema = z.object({
  title: z.string().default(""),
  videoUrl: z.string().default(""),
  hidden: z.boolean().optional(),
});

const blitFinalStatementBlockSchema = z.object({
  title: z.string().default(""),
  hidden: z.boolean().optional(),
});

const blitHorizontalGalleryBlockSchema = z.object({
  heading: z.string().default(""),
  projects: z.array(
    z.object({
      title: z.string().default(""),
      subtitle: z.string().default(""),
      image: z.string().default(""),
      href: z.string().default(""),
    })
  ),
  hidden: z.boolean().optional(),
});

export const legacyHomeMigrationBlockValidators: Record<string, z.ZodTypeAny> = {
  hero: genericHeroBlockSchema,
  features: genericFeaturesBlockSchema,
  faq: genericFaqBlockSchema,
  cta: genericCtaBlockSchema,
  richText: genericRichTextBlockSchema,
  stats: genericStatsBlockSchema,
  gallery: genericGalleryBlockSchema,
  blitHeroCollage: blitHeroCollageBlockSchema,
  blitCapabilitiesGrid: blitCapabilitiesBlockSchema,
  blitFeaturedWork: blitFeaturedWorkBlockSchema,
  blitEditorialStatement: blitEditorialBlockSchema,
  blitVideoSection: blitVideoSectionBlockSchema,
  blitHorizontalGallery: blitHorizontalGalleryBlockSchema,
  blitFinalStatement: blitFinalStatementBlockSchema,
};

type LegacySectionKey =
  | "hero"
  | "services"
  | "featuredWork"
  | "faq"
  | "cta"
  | "testimonials"
  | "awards";

type UnsupportedReason =
  | "UNSUPPORTED_SECTION"
  | "UNSUPPORTED_FIELD"
  | "AMBIGUOUS_MAPPING"
  | "INVALID_VALUE"
  | "MISSING_REQUIRED_TARGET_FIELD";

type PageBlockRecord = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

type WorkProjectRecord = {
  id: string;
  slugDraft: string;
  titleDraft: string;
  excerptDraft: string;
  coverImageDraft: string;
  createdAt: Date;
  publishedAt: Date | null;
  updatedAt: Date;
  tags: Array<{ tag: { name: string; slug: string } }>;
};

type PreviewSupportedMapping = {
  sourceSectionKey: LegacySectionKey;
  sourceFieldKeys: string[];
  targetBlockType: string;
  targetBlockId: string;
  proposedData: Record<string, unknown>;
  warnings: string[];
};

type PreviewUnsupportedItem = {
  sourceSectionKey: LegacySectionKey;
  fieldKey: string | null;
  reason: UnsupportedReason;
  description: string;
};

export type LegacyHomeMigrationPreview = {
  pageKey: "home";
  source: {
    legacySectionCount: number;
    publishedLegacySectionCount: number;
    lastUpdatedAt: string | null;
  };
  supportedMappings: PreviewSupportedMapping[];
  unsupportedItems: PreviewUnsupportedItem[];
  summary: {
    totalSections: number;
    mappedSections: number;
    unsupportedSections: number;
    mappedFields: number;
    unsupportedFields: number;
    hasBlockingIssues: boolean;
  };
  proposedContent: {
    blocks: PageBlockRecord[];
  };
  sourceFingerprint: string;
  generatedAt: string;
};

type MigrationTargetContext = {
  mode: "blit" | "generic";
  allowedBlockTypes: string[];
  blocks: PageBlockRecord[];
  usedBlockIds: Set<string>;
};

type MappingContext = {
  target: MigrationTargetContext;
  workProjects: WorkProjectRecord[];
};

type MappingResult =
  | {
      status: "mapped";
      mapping: PreviewSupportedMapping;
      block: PageBlockRecord;
      unsupportedItems: PreviewUnsupportedItem[];
    }
  | {
      status: "unsupported";
      unsupportedItems: PreviewUnsupportedItem[];
    };

type ScopedLegacySection = {
  siteId: string;
  page: string;
  section: string;
  status: "DRAFT" | "PUBLISHED";
  draftData: Prisma.JsonValue;
  publishedData: Prisma.JsonValue;
  updatedAt: Date;
  publishedAt: Date | null;
};

class LegacyMigrationSourceChangedError extends Error {
  code = "LEGACY_MIGRATION_SOURCE_CHANGED" as const;
}

function stableSortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableSortObject(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableSortObject(entry)])
    );
  }

  return value;
}

function stableStringify(value: unknown) {
  return JSON.stringify(stableSortObject(value));
}

function hashLegacySections(sections: ScopedLegacySection[]) {
  return createHash("sha256")
    .update(
      stableStringify(
        sections.map((section) => ({
          page: section.page,
          section: section.section,
          status: section.status,
          updatedAt: section.updatedAt.toISOString(),
          publishedAt: section.publishedAt?.toISOString() ?? null,
          draftData: section.draftData,
          publishedData: section.publishedData,
        }))
      )
    )
    .digest("hex");
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => readString(entry)).filter(Boolean) : [];
}

function cloneBlock(block: PageBlockRecord): PageBlockRecord {
  return {
    id: block.id,
    type: block.type,
    data: JSON.parse(JSON.stringify(block.data ?? {})) as Record<string, unknown>,
  };
}

function hiddenFlagFromVisible(visible: boolean | undefined) {
  return visible === false ? { hidden: true } : {};
}

function currentBlockData<T extends Record<string, unknown>>(
  context: MigrationTargetContext,
  blockType: string
) {
  const block = context.blocks.find((entry) => entry.type === blockType);
  return block ? (cloneBlock(block).data as T) : ({} as T);
}

function pickOrCreateTargetBlock(
  context: MigrationTargetContext,
  blockType: string,
  fallbackId: string
): PageBlockRecord {
  const existing = context.blocks.find(
    (entry) => entry.type === blockType && !context.usedBlockIds.has(entry.id)
  );
  if (existing) {
    context.usedBlockIds.add(existing.id);
    return cloneBlock(existing);
  }

  const blockId = `${fallbackId}-${blockType.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  context.usedBlockIds.add(blockId);
  return { id: blockId, type: blockType, data: {} };
}

function replaceOrAppendBlock(blocks: PageBlockRecord[], nextBlock: PageBlockRecord) {
  const index = blocks.findIndex((entry) => entry.id === nextBlock.id);
  if (index >= 0) {
    blocks[index] = nextBlock;
    return;
  }

  blocks.push(nextBlock);
}

function hasAllowedBlock(context: MigrationTargetContext, blockType: string) {
  return context.allowedBlockTypes.includes(blockType);
}

function serializeQuoteItems(
  items: Array<{ quote: string; author: string; role: string }>
) {
  return items
    .filter((item) => item.quote || item.author || item.role)
    .map((item) => {
      const attribution = [item.author, item.role].filter(Boolean).join(", ");
      return attribution ? `“${item.quote}”\n— ${attribution}` : `“${item.quote}”`;
    })
    .join("\n\n");
}

function selectFeaturedProjects(
  legacy: z.infer<typeof legacyFeaturedWorkSchema>,
  workProjects: WorkProjectRecord[]
) {
  if (legacy.order === "manual" && legacy.manualSlugs.length > 0) {
    return legacy.manualSlugs
      .map((slug) => workProjects.find((project) => project.slugDraft === slug) ?? null)
      .filter((project): project is WorkProjectRecord => Boolean(project));
  }

  return [...workProjects]
    .sort((left, right) => {
      const leftDate = left.publishedAt ?? left.updatedAt ?? left.createdAt;
      const rightDate = right.publishedAt ?? right.updatedAt ?? right.createdAt;
      return rightDate.getTime() - leftDate.getTime();
    })
    .slice(0, legacy.count);
}

function toGenericGalleryItems(projects: WorkProjectRecord[]) {
  return projects.map((project) => ({
    imageUrl: project.coverImageDraft,
    alt: project.titleDraft,
    caption: project.excerptDraft || project.titleDraft,
  }));
}

function toBlitFeaturedProjects(projects: WorkProjectRecord[]) {
  return projects.map((project) => ({
    title: project.titleDraft,
    category: project.tags[0]?.tag.name ?? "",
    year: String((project.publishedAt ?? project.createdAt).getUTCFullYear()),
    description: project.excerptDraft,
    image: project.coverImageDraft,
    href: `/work/${project.slugDraft}`,
    location: "",
  }));
}

function collectFieldWarnings(
  unsupportedItems: PreviewUnsupportedItem[],
  sectionKey: LegacySectionKey
) {
  return unsupportedItems
    .filter((item) => item.sourceSectionKey === sectionKey)
    .map((item) => item.description);
}

function makeUnsupported(
  sourceSectionKey: LegacySectionKey,
  description: string,
  fieldKey: string | null = null,
  reason: UnsupportedReason = "UNSUPPORTED_SECTION"
): MappingResult {
  return {
    status: "unsupported",
    unsupportedItems: [{ sourceSectionKey, fieldKey, reason, description }],
  };
}

function mapHeroSection(
  legacySection: ScopedLegacySection,
  context: MappingContext
): MappingResult {
  const parsed = legacyHeroSchema.safeParse(readRecord(legacySection.draftData));
  if (!parsed.success) {
    return makeUnsupported("hero", "Legacy hero content could not be validated.", null, "INVALID_VALUE");
  }

  const legacy = parsed.data;
  const warnings: string[] = [];
  const unsupportedItems: PreviewUnsupportedItem[] = [];
  if (legacy.backgroundVideoUrl) {
    unsupportedItems.push({
      sourceSectionKey: "hero",
      fieldKey: "backgroundVideoUrl",
      reason: "UNSUPPORTED_FIELD",
      description: "Legacy hero background video is not represented in the current block mapping.",
    });
  }

  if (context.target.mode === "blit") {
    if (!hasAllowedBlock(context.target, "blitHeroCollage")) {
      return makeUnsupported("hero", "This homepage template does not allow a Blit hero collage block.");
    }
    const targetBlock = pickOrCreateTargetBlock(context.target, "blitHeroCollage", "legacy-home");
    const current = currentBlockData<z.infer<typeof blitHeroCollageBlockSchema>>(
      context.target,
      "blitHeroCollage"
    );
    const images = Array.isArray(current.images) ? [...current.images] : [];
    if (legacy.backgroundImageUrl) {
      if (images.length === 0) {
        images.push({ imageUrl: legacy.backgroundImageUrl, alt: legacy.headline || "Homepage hero" });
      } else if (readString(images[0]?.imageUrl) !== legacy.backgroundImageUrl) {
        images[0] = {
          imageUrl: legacy.backgroundImageUrl,
          alt: readString(images[0]?.alt) || legacy.headline || "Homepage hero",
        };
        warnings.push("Used the legacy hero background image as the first collage image.");
      }
    }

    const proposedData = blitHeroCollageBlockSchema.parse({
      ...current,
      eyebrow: readString(current.eyebrow) || "Home",
      headline: legacy.headline,
      caption: legacy.subheadline,
      images,
      ...hiddenFlagFromVisible(legacy.visible),
    });

    return {
      status: "mapped",
      block: { ...targetBlock, data: proposedData },
      mapping: {
        sourceSectionKey: "hero",
        sourceFieldKeys: ["headline", "subheadline", "backgroundImageUrl", "visible"],
        targetBlockType: targetBlock.type,
        targetBlockId: targetBlock.id,
        proposedData,
        warnings: [...warnings, ...collectFieldWarnings(unsupportedItems, "hero")],
      },
      unsupportedItems,
    };
  }

  if (!hasAllowedBlock(context.target, "hero")) {
    return makeUnsupported("hero", "This homepage template does not allow a hero block.");
  }

  const targetBlock = pickOrCreateTargetBlock(context.target, "hero", "legacy-home");
  const current = currentBlockData<z.infer<typeof genericHeroBlockSchema>>(context.target, "hero");
  const proposedData = genericHeroBlockSchema.parse({
    ...current,
    headline: legacy.headline,
    subheadline: legacy.subheadline,
    backgroundImage: legacy.backgroundImageUrl || readString(current.backgroundImage),
    primaryCtaLabel: readString(current.primaryCtaLabel),
    primaryCtaHref: readString(current.primaryCtaHref),
    ...hiddenFlagFromVisible(legacy.visible),
  });

  return {
    status: "mapped",
    block: { ...targetBlock, data: proposedData },
    mapping: {
      sourceSectionKey: "hero",
      sourceFieldKeys: ["headline", "subheadline", "backgroundImageUrl", "visible"],
      targetBlockType: targetBlock.type,
      targetBlockId: targetBlock.id,
      proposedData,
      warnings: collectFieldWarnings(unsupportedItems, "hero"),
    },
    unsupportedItems,
  };
}

function mapServicesSection(
  legacySection: ScopedLegacySection,
  context: MappingContext
): MappingResult {
  const parsed = legacyServicesSchema.safeParse(readRecord(legacySection.draftData));
  if (!parsed.success) {
    return makeUnsupported("services", "Legacy services content could not be validated.", null, "INVALID_VALUE");
  }

  const legacy = parsed.data;
  const items = legacy.categories
    .filter((category) => category.title || category.items.some((item) => readString(item)))
    .map((category) => ({
      title: category.title,
      description: category.items.map((item) => readString(item)).filter(Boolean).join(" / "),
    }));

  if (items.length === 0 && !legacy.introTitle && !legacy.introText) {
    return makeUnsupported("services", "Legacy services content is empty.", null, "MISSING_REQUIRED_TARGET_FIELD");
  }

  if (context.target.mode === "blit") {
    if (!hasAllowedBlock(context.target, "blitCapabilitiesGrid")) {
      return makeUnsupported("services", "This homepage template does not allow a Blit capabilities block.");
    }

    const targetBlock = pickOrCreateTargetBlock(context.target, "blitCapabilitiesGrid", "legacy-home");
    const current = currentBlockData<z.infer<typeof blitCapabilitiesBlockSchema>>(
      context.target,
      "blitCapabilitiesGrid"
    );
    const currentItems = Array.isArray(current.items) ? current.items : [];
    const proposedData = blitCapabilitiesBlockSchema.parse({
      ...current,
      heading: legacy.introTitle || legacy.introText || readString(current.heading),
      items: items.map((item, index) => ({
        title: item.title,
        description: item.description || legacy.introText,
        imageUrl: readString(currentItems[index]?.imageUrl),
        imageAlt: readString(currentItems[index]?.imageAlt) || item.title,
      })),
      ...hiddenFlagFromVisible(legacy.visible),
    });

    return {
      status: "mapped",
      block: { ...targetBlock, data: proposedData },
      mapping: {
        sourceSectionKey: "services",
        sourceFieldKeys: ["introTitle", "introText", "categories", "visible"],
        targetBlockType: targetBlock.type,
        targetBlockId: targetBlock.id,
        proposedData,
        warnings: [],
      },
      unsupportedItems: [],
    };
  }

  if (!hasAllowedBlock(context.target, "features")) {
    return makeUnsupported("services", "This homepage template does not allow a features block.");
  }

  const targetBlock = pickOrCreateTargetBlock(context.target, "features", "legacy-home");
  const current = currentBlockData<z.infer<typeof genericFeaturesBlockSchema>>(context.target, "features");
  const proposedData = genericFeaturesBlockSchema.parse({
    ...current,
    heading: legacy.introTitle || readString(current.heading),
    items,
    ...hiddenFlagFromVisible(legacy.visible),
  });

  return {
    status: "mapped",
    block: { ...targetBlock, data: proposedData },
    mapping: {
      sourceSectionKey: "services",
      sourceFieldKeys: ["introTitle", "introText", "categories", "visible"],
      targetBlockType: targetBlock.type,
      targetBlockId: targetBlock.id,
      proposedData,
      warnings: [],
    },
    unsupportedItems: [],
  };
}

function mapFeaturedWorkSection(
  legacySection: ScopedLegacySection,
  context: MappingContext
): MappingResult {
  const parsed = legacyFeaturedWorkSchema.safeParse(readRecord(legacySection.draftData));
  if (!parsed.success) {
    return makeUnsupported(
      "featuredWork",
      "Legacy featured work content could not be validated.",
      null,
      "INVALID_VALUE"
    );
  }

  const legacy = parsed.data;
  const warnings: string[] = [];
  const unsupportedItems: PreviewUnsupportedItem[] = [];
  const selectedProjects = selectFeaturedProjects(legacy, context.workProjects);

  if (legacy.order === "manual") {
    const missingSlugs = legacy.manualSlugs.filter(
      (slug) => !selectedProjects.some((project) => project.slugDraft === slug)
    );
    for (const slug of missingSlugs) {
      unsupportedItems.push({
        sourceSectionKey: "featuredWork",
        fieldKey: "manualSlugs",
        reason: "INVALID_VALUE",
        description: `Manual featured-work slug "${slug}" no longer matches a scoped work project.`,
      });
    }
  }

  if (selectedProjects.length === 0) {
    warnings.push("No matching work projects were resolved from the legacy featured-work settings.");
  }

  if (context.target.mode === "blit") {
    if (!hasAllowedBlock(context.target, "blitFeaturedWork")) {
      return makeUnsupported("featuredWork", "This homepage template does not allow a Blit featured-work block.");
    }

    const targetBlock = pickOrCreateTargetBlock(context.target, "blitFeaturedWork", "legacy-home");
    const current = currentBlockData<z.infer<typeof blitFeaturedWorkBlockSchema>>(
      context.target,
      "blitFeaturedWork"
    );
    const currentProjects = Array.isArray(current.projects) ? current.projects : [];
    const proposedData = blitFeaturedWorkBlockSchema.parse({
      ...current,
      title: legacy.title || readString(current.title),
      heading: readString(current.heading) || "featured work",
      projects:
        selectedProjects.length > 0 ? toBlitFeaturedProjects(selectedProjects) : currentProjects,
    });

    return {
      status: "mapped",
      block: { ...targetBlock, data: proposedData },
      mapping: {
        sourceSectionKey: "featuredWork",
        sourceFieldKeys: ["title", "description", "count", "order", "manualSlugs"],
        targetBlockType: targetBlock.type,
        targetBlockId: targetBlock.id,
        proposedData,
        warnings: [...warnings, ...collectFieldWarnings(unsupportedItems, "featuredWork")],
      },
      unsupportedItems,
    };
  }

  if (!hasAllowedBlock(context.target, "gallery")) {
    return makeUnsupported("featuredWork", "This homepage template does not allow a gallery block.");
  }

  const targetBlock = pickOrCreateTargetBlock(context.target, "gallery", "legacy-home");
  const current = currentBlockData<z.infer<typeof genericGalleryBlockSchema>>(context.target, "gallery");
  const currentItems = Array.isArray(current.items) ? current.items : [];
  const proposedData = genericGalleryBlockSchema.parse({
    ...current,
    heading: legacy.title || readString(current.heading) || "Featured work",
    items: selectedProjects.length > 0 ? toGenericGalleryItems(selectedProjects) : currentItems,
  });

  return {
    status: "mapped",
    block: { ...targetBlock, data: proposedData },
    mapping: {
      sourceSectionKey: "featuredWork",
      sourceFieldKeys: ["title", "description", "count", "order", "manualSlugs"],
      targetBlockType: targetBlock.type,
      targetBlockId: targetBlock.id,
      proposedData,
      warnings: [...warnings, ...collectFieldWarnings(unsupportedItems, "featuredWork")],
    },
    unsupportedItems,
  };
}

function mapFaqSection(legacySection: ScopedLegacySection, context: MappingContext): MappingResult {
  if (!hasAllowedBlock(context.target, "faq")) {
    return makeUnsupported("faq", "This homepage template does not allow an FAQ block.");
  }

  const parsed = legacyFaqSchema.safeParse(readRecord(legacySection.draftData));
  if (!parsed.success) {
    return makeUnsupported("faq", "Legacy FAQ content could not be validated.", null, "INVALID_VALUE");
  }

  const legacy = parsed.data;
  const targetBlock = pickOrCreateTargetBlock(context.target, "faq", "legacy-home");
  const current = currentBlockData<z.infer<typeof genericFaqBlockSchema>>(context.target, "faq");
  const proposedData = genericFaqBlockSchema.parse({
    ...current,
    heading: readString(current.heading) || "Frequently asked questions",
    items: legacy.items.filter((item) => item.question || item.answer),
    ...hiddenFlagFromVisible(legacy.visible),
  });

  return {
    status: "mapped",
    block: { ...targetBlock, data: proposedData },
    mapping: {
      sourceSectionKey: "faq",
      sourceFieldKeys: ["items", "visible"],
      targetBlockType: targetBlock.type,
      targetBlockId: targetBlock.id,
      proposedData,
      warnings: [],
    },
    unsupportedItems: [],
  };
}

function mapCtaSection(legacySection: ScopedLegacySection, context: MappingContext): MappingResult {
  const parsed = legacyCtaSchema.safeParse(readRecord(legacySection.draftData));
  if (!parsed.success) {
    return makeUnsupported("cta", "Legacy call-to-action content could not be validated.", null, "INVALID_VALUE");
  }

  const legacy = parsed.data;
  if (context.target.mode === "blit") {
    if (!hasAllowedBlock(context.target, "blitFinalStatement")) {
      return makeUnsupported("cta", "This homepage template does not allow a Blit final-statement block.");
    }

    const targetBlock = pickOrCreateTargetBlock(context.target, "blitFinalStatement", "legacy-home");
    const current = currentBlockData<z.infer<typeof blitFinalStatementBlockSchema>>(
      context.target,
      "blitFinalStatement"
    );
    const proposedData = blitFinalStatementBlockSchema.parse({
      ...current,
      title: legacy.title || readString(current.title),
      ...hiddenFlagFromVisible(legacy.visible),
    });

    return {
      status: "mapped",
      block: { ...targetBlock, data: proposedData },
      mapping: {
        sourceSectionKey: "cta",
        sourceFieldKeys: [
          "title",
          "primaryLabel",
          "primaryHref",
          "secondaryLabel",
          "secondaryHref",
          "visible",
        ],
        targetBlockType: targetBlock.type,
        targetBlockId: targetBlock.id,
        proposedData,
        warnings: [
          "Primary and secondary CTA links were preserved only as warning context because this block type stores a text-only closing statement.",
        ],
      },
      unsupportedItems: [
        {
          sourceSectionKey: "cta",
          fieldKey: "primaryHref",
          reason: "UNSUPPORTED_FIELD",
          description: "Legacy CTA links do not map directly onto the Blit final-statement block.",
        },
        {
          sourceSectionKey: "cta",
          fieldKey: "secondaryHref",
          reason: "UNSUPPORTED_FIELD",
          description: "Legacy CTA links do not map directly onto the Blit final-statement block.",
        },
      ],
    };
  }

  if (!hasAllowedBlock(context.target, "cta")) {
    return makeUnsupported("cta", "This homepage template does not allow a CTA block.");
  }

  const targetBlock = pickOrCreateTargetBlock(context.target, "cta", "legacy-home");
  const current = currentBlockData<z.infer<typeof genericCtaBlockSchema>>(context.target, "cta");
  const proposedData = genericCtaBlockSchema.parse({
    ...current,
    title: legacy.title || readString(current.title),
    label: legacy.primaryLabel || readString(current.label),
    href: legacy.primaryHref || readString(current.href),
    secondaryLabel: legacy.secondaryLabel || readString(current.secondaryLabel),
    secondaryHref: legacy.secondaryHref || readString(current.secondaryHref),
    ...hiddenFlagFromVisible(legacy.visible),
  });

  return {
    status: "mapped",
    block: { ...targetBlock, data: proposedData },
    mapping: {
      sourceSectionKey: "cta",
      sourceFieldKeys: [
        "title",
        "primaryLabel",
        "primaryHref",
        "secondaryLabel",
        "secondaryHref",
        "visible",
      ],
      targetBlockType: targetBlock.type,
      targetBlockId: targetBlock.id,
      proposedData,
      warnings: [],
    },
    unsupportedItems: [],
  };
}

function mapTestimonialsSection(
  legacySection: ScopedLegacySection,
  context: MappingContext
): MappingResult {
  const parsed = legacyTestimonialsSchema.safeParse(readRecord(legacySection.draftData));
  if (!parsed.success) {
    return makeUnsupported(
      "testimonials",
      "Legacy testimonials content could not be validated.",
      null,
      "INVALID_VALUE"
    );
  }

  const legacy = parsed.data;
  if (context.target.mode === "blit") {
    if (!hasAllowedBlock(context.target, "blitEditorialStatement")) {
      return makeUnsupported(
        "testimonials",
        "This homepage template does not allow a Blit editorial statement block."
      );
    }

    const body = serializeQuoteItems(legacy.items);
    if (!body) {
      return makeUnsupported("testimonials", "Legacy testimonials content is empty.", null, "MISSING_REQUIRED_TARGET_FIELD");
    }

    const targetBlock = pickOrCreateTargetBlock(context.target, "blitEditorialStatement", "legacy-home");
    const current = currentBlockData<z.infer<typeof blitEditorialBlockSchema>>(
      context.target,
      "blitEditorialStatement"
    );
    const proposedData = blitEditorialBlockSchema.parse({
      ...current,
      eyebrow: readString(current.eyebrow) || "testimonials",
      title: legacy.title || readString(current.title) || "Testimonials",
      body,
      ...hiddenFlagFromVisible(legacy.visible),
    });

    return {
      status: "mapped",
      block: { ...targetBlock, data: proposedData },
      mapping: {
        sourceSectionKey: "testimonials",
        sourceFieldKeys: ["title", "items", "visible"],
        targetBlockType: targetBlock.type,
        targetBlockId: targetBlock.id,
        proposedData,
        warnings: ["Testimonials were condensed into a single editorial statement block."],
      },
      unsupportedItems: [],
    };
  }

  if (!hasAllowedBlock(context.target, "richText")) {
    return makeUnsupported("testimonials", "This homepage template does not allow a rich-text block.");
  }

  const body = serializeQuoteItems(legacy.items);
  if (!body) {
    return makeUnsupported("testimonials", "Legacy testimonials content is empty.", null, "MISSING_REQUIRED_TARGET_FIELD");
  }

  const targetBlock = pickOrCreateTargetBlock(context.target, "richText", "legacy-home");
  const current = currentBlockData<z.infer<typeof genericRichTextBlockSchema>>(
    context.target,
    "richText"
  );
  const proposedData = genericRichTextBlockSchema.parse({
    ...current,
    title: legacy.title || readString(current.title) || "Testimonials",
    body,
    ...hiddenFlagFromVisible(legacy.visible),
  });

  return {
    status: "mapped",
    block: { ...targetBlock, data: proposedData },
    mapping: {
      sourceSectionKey: "testimonials",
      sourceFieldKeys: ["title", "items", "visible"],
      targetBlockType: targetBlock.type,
      targetBlockId: targetBlock.id,
      proposedData,
      warnings: ["Testimonials were condensed into a single rich-text block."],
    },
    unsupportedItems: [],
  };
}

function mapAwardsSection(legacySection: ScopedLegacySection, context: MappingContext): MappingResult {
  if (!hasAllowedBlock(context.target, "stats")) {
    return makeUnsupported("awards", "This homepage template does not allow a stats block.");
  }

  const parsed = legacyAwardsSchema.safeParse(readRecord(legacySection.draftData));
  if (!parsed.success) {
    return makeUnsupported("awards", "Legacy awards content could not be validated.", null, "INVALID_VALUE");
  }

  const legacy = parsed.data;
  const items = legacy.items
    .filter((item) => item.year || item.title || item.org)
    .map((item) => ({
      value: item.year,
      label: [item.title, item.org].filter(Boolean).join(" / "),
    }));

  if (items.length === 0) {
    return makeUnsupported("awards", "Legacy awards content is empty.", null, "MISSING_REQUIRED_TARGET_FIELD");
  }

  const targetBlock = pickOrCreateTargetBlock(context.target, "stats", "legacy-home");
  const current = currentBlockData<z.infer<typeof genericStatsBlockSchema>>(context.target, "stats");
  const proposedData = genericStatsBlockSchema.parse({
    ...current,
    heading: legacy.title || legacy.listTitle || readString(current.heading) || "Awards",
    items,
    ...hiddenFlagFromVisible(legacy.visible),
  });

  return {
    status: "mapped",
    block: { ...targetBlock, data: proposedData },
    mapping: {
      sourceSectionKey: "awards",
      sourceFieldKeys: ["eyebrow", "title", "listTitle", "items", "visible"],
      targetBlockType: targetBlock.type,
      targetBlockId: targetBlock.id,
      proposedData,
      warnings: ["Awards were condensed into a stats-style block."],
    },
    unsupportedItems: [],
  };
}

const sectionMappers: Record<
  LegacySectionKey,
  (legacySection: ScopedLegacySection, context: MappingContext) => MappingResult
> = {
  hero: mapHeroSection,
  services: mapServicesSection,
  featuredWork: mapFeaturedWorkSection,
  faq: mapFaqSection,
  cta: mapCtaSection,
  testimonials: mapTestimonialsSection,
  awards: mapAwardsSection,
};

const legacySectionOrder: LegacySectionKey[] = [
  "hero",
  "services",
  "featuredWork",
  "faq",
  "cta",
  "testimonials",
  "awards",
];

function getTargetMode(allowedBlockTypes: string[], blocks: PageBlockRecord[]): "blit" | "generic" {
  return allowedBlockTypes.some((type) => type.startsWith("blit")) ||
    blocks.some((block) => block.type.startsWith("blit"))
    ? "blit"
    : "generic";
}

function getSectionLastUpdated(sections: ScopedLegacySection[]) {
  return sections.reduce<Date | null>((latest, section) => {
    if (!latest || section.updatedAt.getTime() > latest.getTime()) {
      return section.updatedAt;
    }
    return latest;
  }, null);
}

async function assertScopedSite(
  prisma: PrismaClient,
  options: { tenantId: string; siteId: string }
) {
  const site = await prisma.site.findFirst({
    where: { id: options.siteId, tenantId: options.tenantId },
    select: { id: true },
  });

  return Boolean(site);
}

async function loadScopedLegacyHomeSections(
  prisma: PrismaClient,
  siteId: string
) {
  const sections = await prisma.cmsSection.findMany({
    where: {
      siteId,
      page: HOME_PAGE_KEY,
      section: { in: legacySectionOrder },
    },
    orderBy: { updatedAt: "asc" },
  });

  return sections as ScopedLegacySection[];
}

async function loadScopedWorkProjects(prisma: PrismaClient, siteId: string) {
  const projects = await prisma.workProject.findMany({
    where: { siteId },
    include: { tags: { include: { tag: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return projects as WorkProjectRecord[];
}

export async function generateLegacyHomeMigrationPreview(
  prisma: PrismaClient,
  options: {
    tenantId: string;
    siteId: string;
  }
) {
  const siteExists = await assertScopedSite(prisma, options);
  if (!siteExists) {
    return { type: "not_found" as const };
  }

  const page = await getAdminPageDraft(prisma, {
    siteId: options.siteId,
    pageKey: HOME_PAGE_KEY,
  });
  if (!page) {
    return { type: "page_not_found" as const };
  }

  const legacySections = await loadScopedLegacyHomeSections(prisma, options.siteId);
  if (legacySections.length === 0) {
    return { type: "empty_legacy" as const };
  }

  const sourceFingerprint = hashLegacySections(legacySections);
  const existingBlocks = Array.isArray(page.content?.blocks) ? page.content.blocks : [];
  const proposedBlocks = existingBlocks.map((block) => cloneBlock(block as PageBlockRecord));
  const target: MigrationTargetContext = {
    mode: getTargetMode(page.allowedBlockTypes, proposedBlocks),
    allowedBlockTypes: [...page.allowedBlockTypes],
    blocks: proposedBlocks,
    usedBlockIds: new Set<string>(),
  };

  const context: MappingContext = {
    target,
    workProjects: await loadScopedWorkProjects(prisma, options.siteId),
  };

  const supportedMappings: PreviewSupportedMapping[] = [];
  const unsupportedItems: PreviewUnsupportedItem[] = [];

  for (const sectionKey of legacySectionOrder) {
    const section = legacySections.find((entry) => entry.section === sectionKey);
    if (!section) {
      continue;
    }

    const mapper = sectionMappers[sectionKey];
    const result = mapper(section, context);
    if (result.status === "mapped") {
      replaceOrAppendBlock(proposedBlocks, result.block);
      supportedMappings.push(result.mapping);
      unsupportedItems.push(...result.unsupportedItems);
      continue;
    }

    unsupportedItems.push(...result.unsupportedItems);
  }

  const unsupportedSections = new Set(unsupportedItems.map((item) => item.sourceSectionKey)).size;
  const preview: LegacyHomeMigrationPreview = {
    pageKey: HOME_PAGE_KEY,
    source: {
      legacySectionCount: legacySections.length,
      publishedLegacySectionCount: legacySections.filter((section) => section.status === "PUBLISHED")
        .length,
      lastUpdatedAt: getSectionLastUpdated(legacySections)?.toISOString() ?? null,
    },
    supportedMappings,
    unsupportedItems,
    summary: {
      totalSections: legacySections.length,
      mappedSections: new Set(supportedMappings.map((mapping) => mapping.sourceSectionKey)).size,
      unsupportedSections,
      mappedFields: supportedMappings.reduce(
        (count, mapping) => count + mapping.sourceFieldKeys.length,
        0
      ),
      unsupportedFields: unsupportedItems.filter((item) => item.fieldKey).length,
      hasBlockingIssues:
        supportedMappings.length === 0 ||
        unsupportedItems.some((item) => item.reason === "MISSING_REQUIRED_TARGET_FIELD"),
    },
    proposedContent: { blocks: proposedBlocks },
    sourceFingerprint,
    generatedAt: new Date().toISOString(),
  };

  return { type: "success" as const, preview, page };
}

function validateProposedBlocks(
  blocks: PageBlockRecord[],
  allowedBlockTypes: string[]
) {
  const errors: PreviewUnsupportedItem[] = [];

  for (const block of blocks) {
    if (!allowedBlockTypes.includes(block.type)) {
      errors.push({
        sourceSectionKey: "hero",
        fieldKey: block.type,
        reason: "UNSUPPORTED_FIELD",
        description: `Block type "${block.type}" is not allowed for this homepage.`,
      });
      continue;
    }

    const validator = legacyHomeMigrationBlockValidators[block.type];
    if (!validator) {
      errors.push({
        sourceSectionKey: "hero",
        fieldKey: block.type,
        reason: "UNSUPPORTED_FIELD",
        description: `Block type "${block.type}" is not supported by the migration validator.`,
      });
      continue;
    }

    const parsed = validator.safeParse(block.data);
    if (!parsed.success) {
      errors.push({
        sourceSectionKey: "hero",
        fieldKey: block.type,
        reason: "INVALID_VALUE",
        description: `Block "${block.type}" failed validation: ${parsed.error.issues[0]?.message ?? "invalid data"}.`,
      });
    }
  }

  return errors;
}

export async function applyLegacyHomeMigrationPreview(
  prisma: PrismaClient,
  options: {
    tenantId: string;
    siteId: string;
    adminId: string;
    sourceFingerprint: string;
    proposedContent: { blocks: PageBlockRecord[] };
  }
) {
  const siteExists = await assertScopedSite(prisma, options);
  if (!siteExists) {
    return { type: "not_found" as const };
  }

  const page = await getAdminPageDraft(prisma, {
    siteId: options.siteId,
    pageKey: HOME_PAGE_KEY,
  });
  if (!page) {
    return { type: "page_not_found" as const };
  }

  const legacySections = await loadScopedLegacyHomeSections(prisma, options.siteId);
  if (legacySections.length === 0) {
    return { type: "empty_legacy" as const };
  }

  const currentFingerprint = hashLegacySections(legacySections);
  if (currentFingerprint !== options.sourceFingerprint) {
    throw new LegacyMigrationSourceChangedError();
  }

  const validationErrors = validateProposedBlocks(
    options.proposedContent.blocks,
    page.allowedBlockTypes
  );
  if (validationErrors.length > 0) {
    return { type: "validation_error" as const, unsupportedItems: validationErrors };
  }

  const result = await saveAdminPageDraft(prisma, {
    siteId: options.siteId,
    pageKey: HOME_PAGE_KEY,
    adminId: options.adminId,
    payload: {
      title: page.title,
      slug: page.slug,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      content: { blocks: options.proposedContent.blocks },
    },
  });

  if (result.type === "validation_error") {
    return {
      type: "validation_error" as const,
      unsupportedItems: [
        {
          sourceSectionKey: "hero" as const,
          fieldKey: null,
          reason: "INVALID_VALUE" as const,
          description: "The generated migration draft did not pass page validation.",
        },
      ],
    };
  }

  if (result.type !== "success") {
    return result;
  }

  return {
    type: "success" as const,
    page: result.page,
  };
}

export async function cancelLegacyHomeMigrationPreview(
  prisma: PrismaClient,
  options: {
    tenantId: string;
    siteId: string;
  }
) {
  const siteExists = await assertScopedSite(prisma, options);
  if (!siteExists) {
    return { type: "not_found" as const };
  }

  return { type: "success" as const };
}

export function isLegacyMigrationSourceChangedError(error: unknown): error is LegacyMigrationSourceChangedError {
  return error instanceof LegacyMigrationSourceChangedError;
}
