import { z } from "zod";

import type {
  PageBlockType,
  SupportedPageDefinition,
} from "../templates/types";

const hrefSchema = z.string().min(1);

const heroBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("hero"),
  data: z
    .object({
      headline: z.string().min(1),
      subheadline: z.string().min(1).optional(),
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

const blockSchema = z.discriminatedUnion("type", [
  heroBlockSchema,
  richTextBlockSchema,
  featuresBlockSchema,
  faqBlockSchema,
  ctaBlockSchema,
  contactBlockSchema,
  statsBlockSchema,
  galleryBlockSchema,
]);

const contentSchema = z
  .object({
    blocks: z.array(blockSchema),
  })
  .strict();

export const pageDraftInputSchema = z
  .object({
    title: z.string().min(1),
    slug: z.string().min(1),
    seoTitle: z.string().min(1).nullable().optional(),
    seoDescription: z.string().min(1).nullable().optional(),
    content: contentSchema,
  })
  .strict();

export type PageDraftInput = z.infer<typeof pageDraftInputSchema>;
export type PageContentInput = PageDraftInput["content"];

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
