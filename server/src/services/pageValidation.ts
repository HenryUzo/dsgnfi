import { z } from "zod";

import type { PageBlockType, SupportedPageDefinition } from "../templates/types";

const hrefSchema = z.string().min(1);
export const pageSlugSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      value === "/" ||
      /^\/?[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(
        value
      ),
    "Slug must be / or lowercase path segments using letters, numbers, and hyphens."
  );

const heroBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("hero"),
  data: z
    .object({
      headline: z.string().min(1),
      subheadline: z.string().min(1).optional(),
      backgroundImage: z.string().min(1).optional(),
      backgroundImageAlt: z.string().optional(),
      primaryCtaLabel: z.string().min(1).optional(),
      primaryCtaHref: hrefSchema.optional(),
    })
    .strict(),
});

const richTextBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("richText"),
  data: z
    .object({
      title: z.string().min(1).optional(),
      body: z.string().min(1),
    })
    .strict(),
});

const featuresBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("features"),
  data: z
    .object({
      heading: z.string().min(1).optional(),
      items: z
        .array(
          z
            .object({
              title: z.string().min(1),
              description: z.string().min(1).optional(),
            })
            .strict()
        )
        .min(1),
    })
    .strict(),
});

const faqBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("faq"),
  data: z
    .object({
      heading: z.string().min(1).optional(),
      items: z
        .array(
          z
            .object({
              question: z.string().min(1),
              answer: z.string().min(1),
            })
            .strict()
        )
        .min(1),
    })
    .strict(),
});

const ctaBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("cta"),
  data: z
    .object({
      title: z.string().min(1),
      label: z.string().min(1),
      href: hrefSchema,
    })
    .strict(),
});

const contactBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("contact"),
  data: z
    .object({
      heading: z.string().min(1).optional(),
      email: z.string().email().or(z.literal("")).optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      formEnabled: z.boolean().optional(),
    })
    .strict(),
});

const statsBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("stats"),
  data: z
    .object({
      heading: z.string().min(1).optional(),
      items: z
        .array(
          z
            .object({
              label: z.string().min(1),
              value: z.string().min(1),
            })
            .strict()
        )
        .min(1),
    })
    .strict(),
});

const galleryBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("gallery"),
  data: z
    .object({
      heading: z.string().min(1).optional(),
      items: z
        .array(
          z
            .object({
              imageUrl: z.string().min(1),
              alt: z.string().optional(),
              caption: z.string().optional(),
            })
            .strict()
        )
        .min(1),
    })
  .strict(),
});

const timelineBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("timeline"),
  data: z
    .object({
      title: z.string().min(1).optional(),
      items: z
        .array(
          z
            .object({
              year: z.string().min(1),
              title: z.string().min(1),
              description: z.string().min(1),
            })
            .strict()
        )
        .min(1),
    })
    .strict(),
});

const processHeroAtticSaltBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("processHeroAtticSalt"),
  variant: z.string().min(1).optional(),
  data: z
    .object({
      title: z.string().min(1),
      collageImageUrl: z.string(),
      collageAlt: z.string().optional(),
    })
    .strict(),
});

const processMethodIntroBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("processMethodIntro"),
  variant: z.string().min(1).optional(),
  data: z
    .object({
      kicker: z.string().min(1),
      paragraphs: z.array(z.string().min(1)).min(1),
      highlightWords: z.array(z.string()).optional(),
    })
    .strict(),
});

const processStepsAccordionBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("processStepsAccordion"),
  variant: z.string().min(1).optional(),
  data: z
    .object({
      heading: z.string().min(1),
      steps: z
        .array(
          z
            .object({
              number: z.string().min(1),
              title: z.string().min(1),
              description: z.string().min(1),
              deliverables: z.array(z.string()).optional(),
            })
            .strict()
        )
        .min(1),
    })
    .strict(),
});

const processMediaPeekCarouselBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("processMediaPeekCarousel"),
  variant: z.string().min(1).optional(),
  data: z
    .object({
      heading: z.string().min(1),
      description: z.string().min(1),
      slides: z
        .array(
          z
            .object({
              title: z.string().min(1),
              mainImageUrl: z.string(),
              peekImageUrl: z.string().optional(),
            })
            .strict()
        )
        .min(1),
      showCounter: z.boolean().optional(),
    })
    .strict(),
});

const processCtaOutlineBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("processCtaOutline"),
  variant: z.string().min(1).optional(),
  data: z
    .object({
      title: z.string().min(1),
      linkLabel: z.string().min(1),
      href: hrefSchema,
    })
    .strict(),
});

const processHeroBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("hero"),
  variant: z.string().min(1).optional(),
  data: z
    .object({
      eyebrow: z.string().optional(),
      headline: z.string().min(1),
      subheadline: z.string().optional(),
      backgroundImage: z.string().optional(),
      primaryCtaLabel: z.string().optional(),
      primaryCtaHref: hrefSchema.optional(),
    })
    .strict(),
});

const processRichTextBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("richText"),
  variant: z.string().min(1).optional(),
  data: z
    .object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      body: z.string().min(1),
    })
    .strict(),
});

const processGalleryBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("gallery"),
  variant: z.string().min(1).optional(),
  data: z
    .object({
      images: z.array(z.string()).min(1),
      caption: z.string().optional(),
    })
    .strict(),
});

const processCtaBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("cta"),
  variant: z.string().min(1).optional(),
  data: z
    .object({
      title: z.string().min(1),
      description: z.string().optional(),
      primaryLabel: z.string().min(1),
      primaryHref: hrefSchema,
    })
    .strict(),
});

const blockSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

const contentSchema = z
  .object({
    blocks: z.array(blockSchema),
  })
  .strict();

export const pageDraftInputSchema = z
  .object({
    title: z.string().min(1),
    slug: pageSlugSchema,
    seoTitle: z.string().min(1).nullable().optional(),
    seoDescription: z.string().min(1).nullable().optional(),
    content: contentSchema,
  })
  .strict();

export type PageDraftInput = z.infer<typeof pageDraftInputSchema>;
export type PageContentInput = PageDraftInput["content"];

export const pageCreateInputSchema = z
  .object({
    templateKey: z.string().min(1),
    title: z.string().trim().min(1),
    slug: pageSlugSchema,
    seoTitle: z.string().trim().min(1).nullable().optional(),
    seoDescription: z.string().trim().min(1).nullable().optional(),
    isVisible: z.boolean().optional(),
    hierarchyRole: z.enum(["MAIN", "INNER"]).optional(),
    defaultParentPageKey: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

export type PageCreateInput = z.infer<typeof pageCreateInputSchema>;

const processCompatibilityBlockSchema = z.discriminatedUnion("type", [
  processHeroAtticSaltBlockSchema,
  processMethodIntroBlockSchema,
  processStepsAccordionBlockSchema,
  processMediaPeekCarouselBlockSchema,
  processCtaOutlineBlockSchema,
  processHeroBlockSchema,
  processRichTextBlockSchema,
  timelineBlockSchema,
  processGalleryBlockSchema,
  processCtaBlockSchema,
]);

const processCompatibilityContentSchema = z
  .object({
    blocks: z.array(processCompatibilityBlockSchema),
  })
  .strict();

export type ProcessCompatibilityContent = z.infer<
  typeof processCompatibilityContentSchema
>;

export function validatePageDraftInput(
  pageDefinition: SupportedPageDefinition,
  payload: unknown
) {
  const parsed = pageDraftInputSchema.safeParse(payload);
  if (!parsed.success) {
    return parsed;
  }

  const invalidBlock = parsed.data.content.blocks.find(
    (block) => !pageDefinition.allowedBlockTypes.includes(block.type as PageBlockType)
  );

  if (invalidBlock) {
    return {
      success: false as const,
      error: new z.ZodError([
        {
          code: "custom",
          path: ["content", "blocks"],
          message: `Block type "${invalidBlock.type}" is not allowed on page "${pageDefinition.pageKey}".`,
        },
      ]),
    };
  }

  return parsed;
}

export function validatePageCreateInput(payload: unknown) {
  return pageCreateInputSchema.safeParse(payload);
}

export function validatePageContent(
  pageDefinition: SupportedPageDefinition,
  content: unknown
) {
  const parsed = contentSchema.safeParse(content);
  if (!parsed.success) {
    return parsed;
  }

  const invalidBlock = parsed.data.blocks.find(
    (block) => !pageDefinition.allowedBlockTypes.includes(block.type as PageBlockType)
  );

  if (invalidBlock) {
    return {
      success: false as const,
      error: new z.ZodError([
        {
          code: "custom",
          path: ["blocks"],
          message: `Block type "${invalidBlock.type}" is not allowed on page "${pageDefinition.pageKey}".`,
        },
      ]),
    };
  }

  return parsed;
}

export function validateProcessCompatibilityContent(content: unknown) {
  return processCompatibilityContentSchema.safeParse(content);
}
