import { z } from "zod";

import { buildStarterSupportedPages } from "../templates/pageDefaults";
import type {
  PageBlockInput,
  PageKey,
  SupportedPageDefinition,
  TemplateManifest,
  TemplateNavigationPresetItem,
  TemplatePresetOverrides,
  TemplateStarterContentHints,
} from "../templates/types";

const pageKeySchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Page keys must be lowercase slugs.");
const pageBlockTypeSchema = z.string().trim().min(1);

const pageBlockSchema = z.object({
  id: z.string().min(1),
  type: pageBlockTypeSchema,
  data: z.record(z.string(), z.unknown()),
});

const themeSchema = z
  .object({
    primaryColor: z.string().optional().nullable(),
    accentColor: z.string().optional().nullable(),
    backgroundColor: z.string().optional().nullable(),
    textColor: z.string().optional().nullable(),
    buttonRadius: z.number().optional().nullable(),
  })
  .partial();

const starterSiteSettingsSchema = z
  .object({
    tagline: z.string().optional().nullable(),
    contactEmail: z.string().email().optional().nullable(),
    contactPhone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    socialLinks: z.record(z.string(), z.string()).optional().nullable(),
    seoTitle: z.string().optional().nullable(),
    seoDescription: z.string().optional().nullable(),
    theme: themeSchema.optional().nullable(),
    locale: z.string().optional().nullable(),
    timezone: z.string().optional().nullable(),
    logoUrl: z.string().optional().nullable(),
    faviconUrl: z.string().optional().nullable(),
  })
  .partial();

const navigationPresetItemSchema = z.object({
  label: z.string().min(1),
  pageKey: pageKeySchema.optional().nullable(),
  href: z
    .string()
    .regex(/^\/|https?:\/\//, "Navigation href must start with / or http.")
    .optional()
    .nullable(),
  visible: z.boolean().optional(),
});

const pageOverrideSchema = z.object({
  pageKey: pageKeySchema,
  title: z.string().min(1).optional(),
  slug: z
    .string()
    .regex(
      /^\/$|^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/,
      "Page slug must be / or a slash-prefixed lowercase path."
    )
    .optional(),
  isRequired: z.boolean().optional(),
  allowedBlockTypes: z.array(pageBlockTypeSchema).optional(),
  defaultBlocks: z.array(pageBlockSchema).optional(),
  seoDefaults: z
    .object({
      seoTitle: z.string().optional().nullable(),
      seoDescription: z.string().optional().nullable(),
    })
    .partial()
    .optional(),
});

const presetOverridesSchema = z
  .object({
    starterSiteSettings: starterSiteSettingsSchema.optional(),
    starterNavigation: z
      .object({
        primary: z.array(navigationPresetItemSchema).optional(),
        footer: z.array(navigationPresetItemSchema).optional(),
      })
      .partial()
      .optional(),
    starterContentHints: z
      .object({
        homeSections: z.array(z.string()).optional(),
        workEnabled: z.boolean().optional(),
        processEnabled: z.boolean().optional(),
      })
      .partial()
      .optional(),
    replaceSupportedPages: z.boolean().optional(),
    supportedPages: z.array(pageOverrideSchema).optional(),
    importProvenance: z.record(z.string(), z.unknown()).optional(),
  })
  .partial();

function navLabel(item: TemplateNavigationPresetItem) {
  return typeof item === "string" ? item : item.label;
}

function toNavObject(item: TemplateNavigationPresetItem) {
  if (typeof item === "string") {
    return {
      label: item,
      pageKey: null,
      href: null,
      visible: true,
    };
  }

  return {
    label: item.label,
    pageKey: item.pageKey ?? null,
    href: item.href ?? null,
    visible: item.visible ?? true,
  };
}

function getSupportedPageMap(processEnabled: boolean, workEnabled: boolean) {
  return new Map(
    buildStarterSupportedPages({ processEnabled, workEnabled }).map((page) => [
      page.pageKey,
      page,
    ])
  );
}

function buildBaseSupportedPages(
  baseManifest: TemplateManifest,
  hints: TemplateStarterContentHints
): SupportedPageDefinition[] {
  const currentBasePages = new Map(
    baseManifest.supportedPages.map((page) => [page.pageKey, page])
  );
  const allStarterPages = getSupportedPageMap(true, true);
  const requiredPageOrder: PageKey[] = ["home", "about", "contact"];
  const optionalPageOrder: PageKey[] = [];

  if (hints.processEnabled) {
    optionalPageOrder.push("process");
  }

  if (hints.workEnabled) {
    optionalPageOrder.push("work");
  }

  return [...requiredPageOrder, ...optionalPageOrder]
    .map((pageKey) => currentBasePages.get(pageKey) ?? allStarterPages.get(pageKey) ?? null)
    .filter((page): page is SupportedPageDefinition => Boolean(page));
}

function mergeSeoDefaults(
  current: SupportedPageDefinition["seoDefaults"] | undefined,
  next:
    | {
        seoTitle?: string | null;
        seoDescription?: string | null;
      }
    | undefined
) {
  if (!current && !next) {
    return undefined;
  }

  return {
    seoTitle: next?.seoTitle ?? current?.seoTitle,
    seoDescription: next?.seoDescription ?? current?.seoDescription,
  };
}

export function validateTemplatePresetOverrides(
  baseManifest: TemplateManifest,
  input: unknown
) {
  const parsed = presetOverridesSchema.safeParse(input);
  if (!parsed.success) {
    return parsed;
  }

  const mergedHints: TemplateStarterContentHints = {
    ...baseManifest.starterContentHints,
    ...parsed.data.starterContentHints,
  };
  const basePages = parsed.data.replaceSupportedPages
    ? []
    : buildBaseSupportedPages(baseManifest, mergedHints);
  const enabledPageKeys = new Set(
    [
      ...basePages.map((page) => page.pageKey),
      ...(parsed.data.replaceSupportedPages
        ? (parsed.data.supportedPages ?? []).map((page) => page.pageKey)
        : []),
    ]
  );
  const pageMap = new Map(basePages.map((page) => [page.pageKey, page]));

  for (const pageOverride of parsed.data.supportedPages ?? []) {
    if (!enabledPageKeys.has(pageOverride.pageKey)) {
      return {
        success: false as const,
        error: new z.ZodError([
          {
            code: "custom",
            path: ["supportedPages", pageOverride.pageKey],
            message: `Page ${pageOverride.pageKey} is not enabled for this template.`,
          },
        ]),
      };
    }

    const targetPage = pageMap.get(pageOverride.pageKey);
    const allowedBlockTypes =
      pageOverride.allowedBlockTypes ??
      targetPage?.allowedBlockTypes ??
      pageOverride.defaultBlocks?.map((block) => block.type) ??
      [];

    for (const block of pageOverride.defaultBlocks ?? []) {
      if (!allowedBlockTypes.includes(block.type)) {
        return {
          success: false as const,
          error: new z.ZodError([
            {
              code: "custom",
              path: ["supportedPages", pageOverride.pageKey, "defaultBlocks", block.id],
              message: `Block type ${block.type} is not allowed for page ${pageOverride.pageKey}.`,
            },
          ]),
        };
      }
    }
  }

  for (const item of parsed.data.starterNavigation?.primary ?? []) {
    if (item.pageKey && !enabledPageKeys.has(item.pageKey)) {
      return {
        success: false as const,
        error: new z.ZodError([
          {
            code: "custom",
            path: ["starterNavigation", "primary", item.label],
            message: `Navigation references disabled page ${item.pageKey}.`,
          },
        ]),
      };
    }
  }

  for (const item of parsed.data.starterNavigation?.footer ?? []) {
    if (item.pageKey && !enabledPageKeys.has(item.pageKey)) {
      return {
        success: false as const,
        error: new z.ZodError([
          {
            code: "custom",
            path: ["starterNavigation", "footer", item.label],
            message: `Navigation references disabled page ${item.pageKey}.`,
          },
        ]),
      };
    }
  }

  return {
    success: true as const,
    data: parsed.data as TemplatePresetOverrides,
  };
}

export function mergeTemplateManifest(
  baseManifest: TemplateManifest,
  overrides?: TemplatePresetOverrides | null
): TemplateManifest {
  if (!overrides) {
    return baseManifest;
  }

  const starterContentHints: TemplateStarterContentHints = {
    ...baseManifest.starterContentHints,
    ...overrides.starterContentHints,
  };

  const basePages = overrides.replaceSupportedPages
    ? []
    : buildBaseSupportedPages(baseManifest, starterContentHints);
  const supportedPagesByKey = new Map<PageKey, SupportedPageDefinition>(
    basePages.map((page) => [page.pageKey, page])
  );

  for (const override of overrides.supportedPages ?? []) {
    const page = supportedPagesByKey.get(override.pageKey);
    const defaultBlocks = override.defaultBlocks ?? page?.defaultBlocks ?? [];
    const allowedBlockTypes =
      override.allowedBlockTypes ??
      page?.allowedBlockTypes ??
      Array.from(new Set(defaultBlocks.map((block) => block.type)));

    supportedPagesByKey.set(
      override.pageKey,
      page
        ? {
        ...page,
        title: override.title ?? page.title,
        slug: override.slug ?? page.slug,
            isRequired: override.isRequired ?? page.isRequired,
            allowedBlockTypes,
            defaultBlocks,
        seoDefaults: mergeSeoDefaults(page.seoDefaults, override.seoDefaults),
          }
        : {
            pageKey: override.pageKey,
            title: override.title ?? override.pageKey,
            slug: override.slug ?? `/${override.pageKey}`,
            isRequired: override.isRequired ?? true,
            allowedBlockTypes,
            defaultBlocks,
            seoDefaults: {
              seoTitle: override.seoDefaults?.seoTitle ?? override.title ?? override.pageKey,
              seoDescription: override.seoDefaults?.seoDescription ?? undefined,
            },
          }
    );
  }

  const supportedPages = Array.from(supportedPagesByKey.values());

  return {
    ...baseManifest,
    starterSiteSettings: {
      ...baseManifest.starterSiteSettings,
      ...overrides.starterSiteSettings,
      theme: {
        ...(baseManifest.starterSiteSettings.theme ?? {}),
        ...(overrides.starterSiteSettings?.theme ?? {}),
      },
    },
    starterNavigation: {
      primary:
        overrides.starterNavigation?.primary ?? baseManifest.starterNavigation.primary,
      footer:
        overrides.starterNavigation?.footer ?? baseManifest.starterNavigation.footer,
    },
    starterContentHints,
    supportedPages,
  };
}

export function normalizeTemplateNavigationLabels(
  items: TemplateNavigationPresetItem[] | undefined
) {
  return (items ?? []).map(navLabel);
}

export function normalizeTemplateNavigationObjects(
  items: TemplateNavigationPresetItem[] | undefined
) {
  return (items ?? []).map(toNavObject);
}

export function toPageOverrideFromSnapshot(options: {
  pageKey: PageKey;
  title: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  blocks: PageBlockInput[];
}) {
  return {
    pageKey: options.pageKey,
    title: options.title,
    slug: options.slug,
    defaultBlocks: options.blocks,
    seoDefaults: {
      seoTitle: options.seoTitle,
      seoDescription: options.seoDescription,
    },
  };
}
