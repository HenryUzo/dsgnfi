import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { useAdmin } from "../../auth/useAdmin";
import { useAdminAiPageContext } from "../../components/admin/AdminAiContext";
import { PageBlocksRenderer } from "../../components/pages/PageBlocksRenderer";
import { ApiError } from "../../lib/api";
import {
  deletePagePrefillBrief,
  getLatestPagePrefillReview,
  getPagePrefillSuggestions,
  recordPagePrefillApplied,
  recordPagePrefillRejected,
  uploadPagePrefillArtifacts,
  type AdminPagePrefillSuggestion,
} from "../../services/adminPagePrefill";
import {
  getAdminPageDraft,
  listAdminPages,
  listAdminAssets,
  publishAdminPage,
  saveAdminPageDraft,
  uploadAdminAsset,
  type AdminPageSummary,
  type AdminPageDetail,
  type PageBlockRecord,
  type SiteAsset,
} from "../../services/siteSettings";

type BlockData = Record<string, unknown>;
type RepeaterItem = Record<string, string>;
type EditorMode = "basic" | "advanced";
type BlockValidationStatus = "complete" | "draft" | "warning" | "hidden";
type InspectorTab = "preview" | "seo" | "history" | "settings";
type PreviewMode = "desktop" | "tablet" | "mobile";
type SaveState = "saved" | "saving" | "unsaved" | "failed";
type PrefillMetadataKey = "title" | "seoTitle" | "seoDescription";
type PrefillSuggestionKey = `${string}::${number}`;
type ValidationIssueSeverity = "warning" | "info";
type ValidationIssue = {
  id: string;
  label: string;
  description: string;
  severity: ValidationIssueSeverity;
  blockId?: string;
};
type RepeaterField = {
  key: string;
  label: string;
  multiline?: boolean;
  kind?: "text" | "pageLink";
};

const MAX_PREFILL_FILES = 3;
const MAX_PREFILL_FILE_BYTES = 8 * 1024 * 1024;
const PREFILL_ACCEPT = ".pdf,.doc,.docx,.txt,.md,image/png,image/jpeg,image/webp";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error(`Could not read ${file.name}.`));
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function prefillSuggestionKey(blockId: string, index: number): PrefillSuggestionKey {
  return `${blockId}::${index}`;
}

export function applySelectedPrefillSuggestionsToPage(
  current: AdminPageDetail,
  prefillSuggestions: AdminPagePrefillSuggestion,
  selectedMetadata: PrefillMetadataKey[],
  selectedSuggestionKeys: PrefillSuggestionKey[]
): AdminPageDetail {
  const nextPage = { ...current };
  for (const key of selectedMetadata) {
    const value = prefillSuggestions.page[key];
    if (typeof value === "string" && value.trim()) {
      nextPage[key] = value;
    }
  }

  const selectedSuggestionsByBlock = new Map<string, AdminPagePrefillSuggestion["blocks"]>();
  prefillSuggestions.blocks.forEach((suggestion, index) => {
    if (!selectedSuggestionKeys.includes(prefillSuggestionKey(suggestion.blockId, index))) {
      return;
    }
    const blockSuggestions = selectedSuggestionsByBlock.get(suggestion.blockId) ?? [];
    blockSuggestions.push(suggestion);
    selectedSuggestionsByBlock.set(suggestion.blockId, blockSuggestions);
  });

  return {
    ...nextPage,
    content: {
      blocks: current.content.blocks.map((block) => {
        const suggestionsForBlock = selectedSuggestionsByBlock.get(block.id);
        if (!suggestionsForBlock || suggestionsForBlock.length === 0) {
          return block;
        }

        return {
          ...block,
          data: suggestionsForBlock.reduce(
            (nextData, suggestion) => ({
              ...nextData,
              ...suggestion.dataPatch,
            }),
            block.data
          ),
        };
      }),
    },
  };
}

function getInitialPrefillSelectionState(suggestions: AdminPagePrefillSuggestion) {
  return {
    metadata: (["title", "seoTitle", "seoDescription"] as const).filter((key) =>
      Boolean(suggestions.page[key])
    ),
    suggestionKeys: suggestions.blocks.map((suggestion, index) =>
      prefillSuggestionKey(suggestion.blockId, index)
    ),
  };
}

type ImportedBlockField =
  | { kind: "text"; key: string; label: string; multiline?: boolean }
  | { kind: "list"; key: string; label: string }
  | {
      kind: "repeater";
      key: string;
      label: string;
      fields: RepeaterField[];
      createItem: () => RepeaterItem;
    };

const importedBlockSchemas: Record<
  string,
  {
    label: string;
    description: string;
    fields: ImportedBlockField[];
  }
> = {
  blitHeroCollage: {
    label: "Blit Hero Collage",
    description: "Editable headline, caption, and collage images from the imported Blit homepage.",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "headline", label: "Headline", multiline: true },
      { kind: "text", key: "caption", label: "Caption", multiline: true },
      {
        kind: "repeater",
        key: "images",
        label: "Collage images",
        fields: [
          { key: "imageUrl", label: "Image URL" },
          { key: "alt", label: "Alt text" },
        ],
        createItem: () => ({ imageUrl: "", alt: "" }),
      },
    ],
  },
  blitFeaturedWork: {
    label: "Blit Featured Work",
    description: "Featured project cards from the imported Blit template.",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "text", key: "title", label: "Title", multiline: true },
      { kind: "text", key: "ctaLabel", label: "CTA label" },
      { kind: "text", key: "ctaHref", label: "CTA link" },
      {
        kind: "repeater",
        key: "projects",
        label: "Projects",
        fields: [
          { key: "title", label: "Title" },
          { key: "category", label: "Category" },
          { key: "year", label: "Year" },
          { key: "description", label: "Description", multiline: true },
          { key: "image", label: "Image URL" },
          { key: "href", label: "Case study link", kind: "pageLink" },
          { key: "location", label: "Location" },
        ],
        createItem: () => ({ title: "Project", category: "", year: "", description: "", image: "", href: "", hrefPageKey: "" }),
      },
    ],
  },
  blitEditorialStatement: {
    label: "Blit Editorial Statement",
    description: "Large statement section with eyebrow, title, and body copy.",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "title", label: "Title", multiline: true },
      { kind: "text", key: "body", label: "Body", multiline: true },
    ],
  },
  blitVideoSection: {
    label: "Blit Video Section",
    description: "Full-width imported video section.",
    fields: [
      { kind: "text", key: "title", label: "Title" },
      { kind: "text", key: "videoUrl", label: "Video URL" },
    ],
  },
  blitCapabilitiesGrid: {
    label: "Blit Capabilities Grid",
    description: "Capability cards with a supporting image.",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "text", key: "imageUrl", label: "Image URL" },
      {
        kind: "repeater",
        key: "items",
        label: "Capabilities",
        fields: [
          { key: "title", label: "Title" },
          { key: "description", label: "Description", multiline: true },
          { key: "imageUrl", label: "Image URL" },
          { key: "imageAlt", label: "Image alt text" },
        ],
        createItem: () => ({ title: "Capability", description: "", imageUrl: "", imageAlt: "" }),
      },
    ],
  },
  blitHorizontalGallery: {
    label: "Blit Horizontal Gallery",
    description: "Horizontal project gallery.",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "repeater",
        key: "projects",
        label: "Gallery projects",
        fields: [
          { key: "title", label: "Title" },
          { key: "subtitle", label: "Subtitle" },
          { key: "image", label: "Image URL" },
          { key: "href", label: "Link", kind: "pageLink" },
        ],
        createItem: () => ({ title: "Gallery item", subtitle: "", image: "", href: "", hrefPageKey: "" }),
      },
    ],
  },
  blitFinalStatement: {
    label: "Blit Final Statement",
    description: "Large closing statement.",
    fields: [{ kind: "text", key: "title", label: "Title", multiline: true }],
  },
  blitWorksIndex: {
    label: "Blit Works Index",
    description: "Editable works index with filters and project data.",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "text", key: "moreTitle", label: "Mobile more works title" },
      { kind: "text", key: "listLabel", label: "Mobile list label" },
      { kind: "list", key: "filters", label: "Filters" },
      {
        kind: "repeater",
        key: "projects",
        label: "Projects",
        fields: [
          { key: "title", label: "Title" },
          { key: "category", label: "Category" },
          { key: "year", label: "Year" },
          { key: "description", label: "Description", multiline: true },
          { key: "image", label: "Image URL" },
          { key: "href", label: "Case study link", kind: "pageLink" },
        ],
        createItem: () => ({ title: "Project", category: "", year: "", description: "", image: "", href: "", hrefPageKey: "" }),
      },
    ],
  },
  blitStudioHero: {
    label: "Blit Studio Hero",
    description: "Studio page hero.",
    fields: [
      { kind: "text", key: "title", label: "Title" },
      { kind: "text", key: "subtitle", label: "Subtitle", multiline: true },
      { kind: "text", key: "imageUrl", label: "Image URL" },
    ],
  },
  blitStudioIntro: {
    label: "Blit Studio Intro",
    description: "Black intro band with large studio positioning copy.",
    fields: [
      { kind: "text", key: "body", label: "Body", multiline: true },
      { kind: "text", key: "kicker", label: "Supporting copy", multiline: true },
    ],
  },
  blitPhilosophy: {
    label: "Blit Philosophy",
    description: "Studio philosophy copy.",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "text", key: "body", label: "Body", multiline: true },
    ],
  },
  blitFormatStatement: {
    label: "Blit Format Statement",
    description: "Image and oversized statement section from the studio reference.",
    fields: [
      { kind: "text", key: "title", label: "Title", multiline: true },
      { kind: "text", key: "body", label: "Body", multiline: true },
      { kind: "text", key: "imageUrl", label: "Image URL" },
    ],
  },
  blitStudioImageStatement: {
    label: "Blit Studio Image Statement",
    description: "Wide studio image with a short editorial caption.",
    fields: [
      { kind: "text", key: "title", label: "Title", multiline: true },
      { kind: "text", key: "imageUrl", label: "Image URL" },
      { kind: "text", key: "caption", label: "Caption", multiline: true },
    ],
  },
  blitTeamStatement: {
    label: "Blit Team Statement",
    description: "Large immersive statement with team member portraits.",
    fields: [
      { kind: "text", key: "title", label: "Title", multiline: true },
      {
        kind: "repeater",
        key: "people",
        label: "People",
        fields: [
          { key: "name", label: "Name" },
          { key: "role", label: "Role" },
          { key: "imageUrl", label: "Image URL" },
        ],
        createItem: () => ({ name: "Team member", role: "", imageUrl: "" }),
      },
    ],
  },
  blitAwards: {
    label: "Blit Awards",
    description: "Awards copy with supporting studio image.",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "text", key: "body", label: "Body", multiline: true },
      { kind: "text", key: "secondaryBody", label: "Secondary body", multiline: true },
      { kind: "text", key: "imageUrl", label: "Image URL" },
    ],
  },
  blitVideoQuote: {
    label: "Blit Video Quote",
    description: "Dark video and pull-quote CTA section.",
    fields: [
      { kind: "text", key: "videoUrl", label: "Video URL" },
      { kind: "text", key: "kicker", label: "Kicker", multiline: true },
      { kind: "text", key: "quote", label: "Quote", multiline: true },
      { kind: "text", key: "body", label: "Body", multiline: true },
      { kind: "text", key: "ctaLabel", label: "CTA label" },
      { kind: "text", key: "ctaHref", label: "CTA link" },
    ],
  },
  blitCareers: {
    label: "Blit Careers",
    description: "Orange careers block with editable role rows.",
    fields: [
      { kind: "text", key: "title", label: "Title" },
      { kind: "text", key: "body", label: "Body", multiline: true },
      {
        kind: "repeater",
        key: "jobs",
        label: "Jobs",
        fields: [
          { key: "title", label: "Title" },
          { key: "href", label: "Link", kind: "pageLink" },
        ],
        createItem: () => ({ title: "Role", href: "/contact", hrefPageKey: "" }),
      },
    ],
  },
  blitManifesto: {
    label: "Blit Manifesto",
    description: "Editable manifesto statements.",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "list", key: "items", label: "Statements" },
    ],
  },
  blitOriginals: {
    label: "Blit Originals",
    description: "Original work gallery.",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "repeater",
        key: "projects",
        label: "Originals",
        fields: [
          { key: "title", label: "Title" },
          { key: "subtitle", label: "Subtitle" },
          { key: "image", label: "Image URL" },
          { key: "href", label: "Link", kind: "pageLink" },
        ],
        createItem: () => ({ title: "Original", subtitle: "", image: "", href: "", hrefPageKey: "" }),
      },
    ],
  },
  blitContactHero: {
    label: "Blit Contact Hero",
    description: "Contact page intro.",
    fields: [
      { kind: "text", key: "title", label: "Headline" },
      { kind: "text", key: "subtitle", label: "Subtitle", multiline: true },
      { kind: "text", key: "formIntro", label: "Form intro", multiline: true },
      { kind: "text", key: "submitLabel", label: "Submit label" },
      { kind: "text", key: "successCopy", label: "Success message", multiline: true },
    ],
  },
  blitContactGrid: {
    label: "Blit Contact Grid",
    description: "Contact groups and people.",
    fields: [
      {
        kind: "repeater",
        key: "groups",
        label: "Contact groups",
        fields: [
          { key: "title", label: "Group title" },
          { key: "contactsJson", label: "Contacts JSON", multiline: true },
        ],
        createItem: () => ({ title: "Group", contactsJson: "[]" }),
      },
    ],
  },
  blitOffices: {
    label: "Blit Offices",
    description: "Office locations.",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "repeater",
        key: "offices",
        label: "Offices",
        fields: [
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "address", label: "Address", multiline: true },
          { key: "mapUrl", label: "Map URL" },
        ],
        createItem: () => ({ name: "Office", phone: "", address: "", mapUrl: "" }),
      },
    ],
  },
  blitUnfoldedHero: {
    label: "Blit Unfolded Hero",
    description: "Editorial video hero.",
    fields: [
      { kind: "text", key: "title", label: "Title" },
      { kind: "text", key: "subtitle", label: "Subtitle", multiline: true },
      { kind: "text", key: "videoUrl", label: "Video URL" },
    ],
  },
  blitArticleGrid: {
    label: "Blit Article Grid",
    description: "Editorial article cards.",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      {
        kind: "repeater",
        key: "articles",
        label: "Articles",
        fields: [
          { key: "title", label: "Title" },
          { key: "date", label: "Date" },
          { key: "image", label: "Image URL" },
        ],
        createItem: () => ({ title: "Article", date: "", image: "" }),
      },
    ],
  },
  blitCaseStudyHero: {
    label: "Blit Case Study Hero",
    description: "Project metadata, hero media, and opening narrative for an imported case study.",
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow" },
      { kind: "text", key: "title", label: "Title", multiline: true },
      { kind: "text", key: "summary", label: "Summary", multiline: true },
      { kind: "text", key: "year", label: "Year" },
      { kind: "text", key: "category", label: "Category" },
      { kind: "text", key: "discipline", label: "Discipline" },
      { kind: "text", key: "location", label: "Location" },
      { kind: "text", key: "projectLabel", label: "Project label" },
      { kind: "text", key: "projectValue", label: "Project value" },
      { kind: "text", key: "partnerLabel", label: "Partner label" },
      { kind: "text", key: "partnerValue", label: "Partner value" },
      { kind: "text", key: "primaryMediaUrl", label: "Primary media URL" },
      { kind: "text", key: "primaryMediaKind", label: "Primary media kind" },
      { kind: "text", key: "secondaryMediaUrl", label: "Secondary media URL" },
      { kind: "text", key: "secondaryMediaKind", label: "Secondary media kind" },
      { kind: "text", key: "introBody", label: "Intro body", multiline: true },
    ],
  },
  blitCaseStudyHighlights: {
    label: "Blit Case Study Highlights",
    description: "Story beats and supporting media for the case study.",
    fields: [
      {
        kind: "repeater",
        key: "stories",
        label: "Story beats",
        fields: [
          { key: "title", label: "Title" },
          { key: "body", label: "Body", multiline: true },
        ],
        createItem: () => ({ title: "Story title", body: "" }),
      },
      {
        kind: "repeater",
        key: "media",
        label: "Media items",
        fields: [
          { key: "src", label: "Media URL" },
          { key: "kind", label: "Kind" },
          { key: "alt", label: "Alt text" },
        ],
        createItem: () => ({ src: "", kind: "image", alt: "" }),
      },
    ],
  },
  blitCaseStudyTechnical: {
    label: "Blit Case Study Technical",
    description: "Technical system detail with supporting media.",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "list", key: "paragraphs", label: "Paragraphs" },
      {
        kind: "repeater",
        key: "media",
        label: "Media items",
        fields: [
          { key: "src", label: "Media URL" },
          { key: "kind", label: "Kind" },
          { key: "alt", label: "Alt text" },
        ],
        createItem: () => ({ src: "", kind: "image", alt: "" }),
      },
    ],
  },
  blitCaseStudyCredits: {
    label: "Blit Case Study Credits",
    description: "Credits block for the project team.",
    fields: [
      { kind: "text", key: "heading", label: "Heading" },
      { kind: "list", key: "team", label: "Team members" },
    ],
  },
};

function blockDataDefaults(type: string): BlockData {
  if (importedBlockSchemas[type]) {
    return Object.fromEntries(
      importedBlockSchemas[type].fields.map((field) => {
        if (field.kind === "repeater") {
          return [field.key, [field.createItem()]];
        }
        if (field.kind === "list") {
          return [field.key, ["All"]];
        }
        return [field.key, ""];
      })
    );
  }

  switch (type) {
    case "hero":
      return {
        headline: "New headline",
        subheadline: "Add supporting copy.",
        primaryCtaLabel: "Contact",
        primaryCtaHref: "/contact",
        backgroundImage: "",
        backgroundImageAlt: "",
      };
    case "richText":
      return {
        title: "Section title",
        body: "Write the main body copy here.",
      };
    case "features":
      return {
        heading: "Features",
        items: [{ title: "Feature", description: "Describe the feature." }],
      };
    case "faq":
      return {
        heading: "FAQ",
        items: [{ question: "Question", answer: "Answer" }],
      };
    case "cta":
      return {
        title: "Ready to act?",
        label: "Contact us",
        href: "/contact",
      };
    case "contact":
      return {
        heading: "Contact",
        email: "hello@example.com",
        phone: "",
        address: "",
        formEnabled: true,
      };
    case "stats":
      return {
        heading: "Stats",
        items: [{ label: "Metric", value: "24+" }],
      };
    case "gallery":
      return {
        heading: "Gallery",
        items: [
          {
            imageUrl: "",
            alt: "",
            caption: "",
          },
        ],
      };
    default:
      return {};
  }
}

function getBlockLabel(type: string) {
  if (importedBlockSchemas[type]) {
    return importedBlockSchemas[type].label;
  }

  switch (type) {
    case "hero":
      return "Hero";
    case "richText":
      return "Text Section";
    case "features":
      return "Features";
    case "faq":
      return "FAQ";
    case "cta":
      return "Call To Action";
    case "contact":
      return "Contact Details";
    case "stats":
      return "Stats";
    case "gallery":
      return "Gallery";
    default:
      return type;
  }
}

function getBlockDescription(type: string) {
  if (importedBlockSchemas[type]) {
    return importedBlockSchemas[type].description;
  }

  switch (type) {
    case "hero":
      return "This is the top section visitors see first.";
    case "richText":
      return "Use this for longer copy and explanation.";
    case "features":
      return "List key offers, services, or benefits.";
    case "faq":
      return "Answer common questions clearly.";
    case "cta":
      return "Guide visitors to the next action.";
    case "contact":
      return "Show the main contact details for this page.";
    case "stats":
      return "Highlight proof points or metrics.";
    case "gallery":
      return "Display supporting images with captions.";
    default:
      return "Edit this section carefully.";
  }
}

function getString(data: BlockData, key: string) {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function getLinkedPageKeyField(key: string) {
  return `${key}PageKey`;
}

function normalizeInternalPageHref(slug: string | null | undefined) {
  if (!slug || slug === "/") {
    return "/";
  }

  return slug.startsWith("/") ? slug : `/${slug}`;
}

function getBoolean(data: BlockData, key: string) {
  return data[key] === true;
}

function getItems(data: BlockData): RepeaterItem[] {
  const items = data.items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    if (!item || typeof item !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(item as Record<string, unknown>).map(([key, value]) => [
        key,
        typeof value === "string" ? value : "",
      ])
    );
  });
}

function getArrayFieldItems(
  data: BlockData,
  key: string,
  fields: RepeaterField[]
): RepeaterItem[] {
  const items = data[key];
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {};
    }

    const record = item as Record<string, unknown>;
    return Object.fromEntries(
      fields.flatMap((field) => {
        if (field.key.endsWith("Json")) {
          const sourceKey = field.key.slice(0, -"Json".length);
          return [[field.key, JSON.stringify(record[sourceKey] ?? [], null, 2)]];
        }

        const entries: Array<[string, string]> = [];
        const value = record[field.key];
        entries.push([field.key, typeof value === "string" ? value : ""]);

        if (field.kind === "pageLink") {
          const linkedPageKey = record[getLinkedPageKeyField(field.key)];
          entries.push([
            getLinkedPageKeyField(field.key),
            typeof linkedPageKey === "string" ? linkedPageKey : "",
          ]);
        }

        return entries;
      })
    );
  });
}

function applyArrayFieldItems(items: RepeaterItem[]) {
  return items.map((item) => {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (key.endsWith("Json")) {
        const sourceKey = key.slice(0, -"Json".length);
        try {
          next[sourceKey] = JSON.parse(value || "[]");
        } catch {
          next[sourceKey] = [];
        }
      } else {
        next[key] = value;
      }
    }
    return next;
  });
}

function syncLinkedPageHrefsInBlocks(
  blocks: PageBlockRecord[],
  pages: Pick<AdminPageSummary, "pageKey" | "slug">[]
) {
  const hrefByPageKey = new Map(
    pages.map((page) => [page.pageKey, normalizeInternalPageHref(page.slug)])
  );

  return blocks.map((block) => {
    const nextData: BlockData = {};
    let changed = false;

    for (const [dataKey, dataValue] of Object.entries(block.data ?? {})) {
      if (!Array.isArray(dataValue)) {
        nextData[dataKey] = dataValue;
        continue;
      }

      const nextItems = dataValue.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return item;
        }

        const record = { ...(item as Record<string, unknown>) };
        let itemChanged = false;

        for (const [itemKey, itemValue] of Object.entries(record)) {
          if (!itemKey.endsWith("PageKey") || typeof itemValue !== "string" || !itemValue) {
            continue;
          }

          const sourceFieldKey = itemKey.slice(0, -"PageKey".length);
          const href = hrefByPageKey.get(itemValue);
          if (href && record[sourceFieldKey] !== href) {
            record[sourceFieldKey] = href;
            itemChanged = true;
          }
        }

        if (itemChanged) {
          changed = true;
          return record;
        }

        return item;
      });

      nextData[dataKey] = nextItems;
    }

    if (!changed) {
      return block;
    }

    return {
      ...block,
      data: nextData,
    };
  });
}

function getTemplateContext(pageTemplateKey?: string | null) {
  if (!pageTemplateKey) {
    return null;
  }

  if (pageTemplateKey.includes("doctor") || pageTemplateKey.includes("service-line")) {
    return "healthcare";
  }

  if (pageTemplateKey.includes("program") || pageTemplateKey.includes("admissions")) {
    return "education";
  }

  if (pageTemplateKey.includes("menu") || pageTemplateKey.includes("private-dining")) {
    return "food";
  }

  if (pageTemplateKey.includes("listing") || pageTemplateKey.includes("neighborhood")) {
    return "property";
  }

  if (pageTemplateKey.includes("coverage") || pageTemplateKey.includes("industry-solutions")) {
    return "logistics";
  }

  if (
    pageTemplateKey.includes("case-study") ||
    pageTemplateKey.includes("capabilities") ||
    pageTemplateKey.includes("studio")
  ) {
    return "agency";
  }

  if (
    pageTemplateKey.includes("team") ||
    pageTemplateKey.includes("services") ||
    pageTemplateKey.includes("faq") ||
    pageTemplateKey.includes("location") ||
    pageTemplateKey.includes("campaign") ||
    pageTemplateKey.includes("standard")
  ) {
    return "general";
  }

  return "general";
}

function getSectionHint(pageTemplateKey: string | null | undefined, blockType: string) {
  const context = getTemplateContext(pageTemplateKey);

  if (context === "healthcare") {
    switch (blockType) {
      case "hero":
        return "Lead with clarity and trust. Explain the care need, who this page helps, and the next action for a patient.";
      case "richText":
        return "Use straightforward language. Explain process, preparation, and what patients should expect.";
      case "features":
        return "Break the service or specialty into simple patient-focused points.";
      case "faq":
        return "Answer timing, eligibility, cost, and appointment questions early.";
      case "gallery":
        return "Use real care environment or clinician imagery that builds trust.";
      default:
        return null;
    }
  }

  if (context === "logistics") {
    switch (blockType) {
      case "hero":
        return "State the service scope, region, or operational promise immediately.";
      case "richText":
        return "Explain how the operation works and why it is reliable.";
      case "features":
        return "Use this section for lanes, coverage, response standards, or service tiers.";
      case "stats":
        return "Use real operational proof points such as delivery speed, regions served, or uptime.";
      default:
        return null;
    }
  }

  if (context === "agency") {
    switch (blockType) {
      case "hero":
        return "Lead with the transformation or business outcome, not just the service name.";
      case "richText":
        return "Frame your thinking, process, and why the offer matters to the client.";
      case "gallery":
        return "Use visual proof that supports the story rather than generic decoration.";
      default:
        return null;
    }
  }

  return null;
}

function getLineageStatusLabel(page: AdminPageDetail) {
  if (!page.lineage.isTracked) {
    return "Untracked";
  }

  return page.lineage.status === "INHERITED" ? "Inherited from template" : "Modified from template";
}

function getLineagePanelTone(page: AdminPageDetail) {
  if (!page.lineage.isTracked) {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (page.lineage.status === "INHERITED") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
  }

  return "border-sky-300/20 bg-sky-300/10 text-sky-100";
}

function getLineageSource(page: AdminPageDetail) {
  if (!page.lineage.isTracked) {
    return "No source template lineage could be resolved for this page.";
  }

  const version = page.lineage.sourceTemplateVersion
    ? ` v${page.lineage.sourceTemplateVersion}`
    : "";
  const blueprint = page.lineage.sourcePageBlueprintKey
    ? ` / ${page.lineage.sourcePageBlueprintKey}`
    : "";

  return `${page.lineage.sourceTemplateName ?? page.lineage.sourceTemplateKey}${version}${blueprint}`;
}

function isBlockHidden(block: PageBlockRecord) {
  return block.data?.hidden === true;
}

const requiredKeysByType: Record<string, string[]> = {
  hero: ["headline"],
  richText: ["title", "body"],
  cta: ["title", "label"],
  contact: ["heading"],
  gallery: ["heading"],
  blitHeroCollage: ["headline"],
  blitFeaturedWork: ["title"],
  blitEditorialStatement: ["title"],
  blitVideoSection: ["title", "videoUrl"],
  blitCapabilitiesGrid: ["heading"],
  blitGallery: ["title"],
  blitFinalStatement: ["title"],
  blitCaseStudyHero: ["title", "primaryMediaUrl"],
  blitCaseStudyTechnical: ["heading"],
  blitCaseStudyCredits: ["heading"],
};

const nativeBlockTypes = ["hero", "richText", "features", "faq", "cta", "contact", "stats", "gallery"];

function getMissingRequiredKeys(block: PageBlockRecord) {
  const requiredKeys = requiredKeysByType[block.type] ?? [];
  return requiredKeys.filter((key) => !getString(block.data ?? {}, key).trim());
}

function getBlockStatus(block: PageBlockRecord): BlockValidationStatus {
  if (isBlockHidden(block)) {
    return "hidden";
  }

  if (!importedBlockSchemas[block.type] && !nativeBlockTypes.includes(block.type)) {
    return "warning";
  }

  return getMissingRequiredKeys(block).length > 0 ? "draft" : "complete";
}

function getStatusMeta(status: BlockValidationStatus) {
  switch (status) {
    case "complete":
      return { label: "Complete", dot: "bg-emerald-400", text: "text-emerald-200" };
    case "draft":
      return { label: "Draft", dot: "bg-amber-300", text: "text-amber-100" };
    case "warning":
      return { label: "Warning", dot: "bg-violet-400", text: "text-violet-100" };
    case "hidden":
      return { label: "Hidden", dot: "bg-white/35", text: "text-white/45" };
  }
}

function getValidationSummary(blocks: PageBlockRecord[]) {
  const statuses = blocks.map(getBlockStatus);
  const warnings = statuses.filter((status) => status === "warning").length;
  const drafts = statuses.filter((status) => status === "draft").length;
  const hidden = statuses.filter((status) => status === "hidden").length;

  if (warnings > 0) {
    return { label: `${warnings} warning${warnings === 1 ? "" : "s"}`, tone: "text-violet-100" };
  }

  if (drafts > 0) {
    return { label: `${drafts} draft block${drafts === 1 ? "" : "s"}`, tone: "text-amber-100" };
  }

  if (hidden > 0) {
    return { label: `Ready, ${hidden} hidden`, tone: "text-emerald-200" };
  }

  return { label: "Ready to publish", tone: "text-emerald-200" };
}

function getValidationIssues(page: AdminPageDetail) {
  const issues: ValidationIssue[] = [];

  if (!page.slug || !page.slug.startsWith("/")) {
    issues.push({
      id: "page-slug",
      label: "Slug should start with /",
      description: "Use a leading slash so public and preview links resolve consistently.",
      severity: "warning",
    });
  }

  if (!page.seoTitle?.trim()) {
    issues.push({
      id: "seo-title",
      label: "SEO title is empty",
      description: "Add a concise title for browser tabs and search snippets.",
      severity: "warning",
    });
  }

  if (!page.seoDescription?.trim()) {
    issues.push({
      id: "seo-description",
      label: "SEO description is empty",
      description: "Add a short description so shared links and search previews have context.",
      severity: "warning",
    });
  }

  if (page.status === "DRAFT") {
    issues.push({
      id: "draft-status",
      label: "Page has unpublished draft changes",
      description: "Save the draft, then use the publish confirmation when you are ready to make it live.",
      severity: "info",
    });
  }

  page.content.blocks.forEach((block, index) => {
    if (!importedBlockSchemas[block.type] && !nativeBlockTypes.includes(block.type)) {
      issues.push({
        id: `${block.id}-unknown`,
        label: `${getBlockLabel(block.type)} uses an unknown block type`,
        description: "This block can still be edited as raw fields, but template-specific controls are unavailable.",
        severity: "warning",
        blockId: block.id,
      });
    }

    getMissingRequiredKeys(block).forEach((key) => {
      issues.push({
        id: `${block.id}-${key}`,
        label: `${getBlockLabel(block.type)} is missing ${key}`,
        description: `Block ${index + 1} needs ${key} before it is considered complete.`,
        severity: "warning",
        blockId: block.id,
      });
    });

    const data = block.data ?? {};
    const hasImage =
      Boolean(getString(data, "image")) ||
      Boolean(getString(data, "imageUrl")) ||
      Boolean(getString(data, "primaryMediaUrl"));
    const hasAlt = Boolean(getString(data, "alt").trim() || getString(data, "altText").trim());
    if (hasImage && !hasAlt) {
      issues.push({
        id: `${block.id}-alt`,
        label: `${getBlockLabel(block.type)} image needs alt text`,
        description: "Add alt text where the block supports it so images are accessible.",
        severity: "warning",
        blockId: block.id,
      });
    }

    if (isBlockHidden(block)) {
      issues.push({
        id: `${block.id}-hidden`,
        label: `${getBlockLabel(block.type)} is hidden`,
        description: `Block ${index + 1} will not appear on the public page until it is shown again.`,
        severity: "info",
        blockId: block.id,
      });
    }
  });

  return issues;
}

function formatSavedAt(value: string | null) {
  if (!value) {
    return "Not saved yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getFieldPlaceholder(
  pageTemplateKey: string | null | undefined,
  blockType: string,
  fieldKey: string
) {
  const context = getTemplateContext(pageTemplateKey);

  if (blockType === "hero" && fieldKey === "headline") {
    if (context === "healthcare") return "Compassionate care for a clear next step";
    if (context === "logistics") return "Reliable delivery across your critical routes";
    if (context === "agency") return "A sharper brand system built for growth";
  }

  if (blockType === "richText" && fieldKey === "body") {
    if (context === "healthcare") {
      return "Explain how the service works, who it is for, and how patients should prepare.";
    }
    if (context === "logistics") {
      return "Explain operational coverage, service expectations, and how requests move through your team.";
    }
    if (context === "agency") {
      return "Explain the business problem, the strategic approach, and the value of the engagement.";
    }
  }

  if (blockType === "cta" && fieldKey === "title") {
    if (context === "healthcare") return "Ready to book care?";
    if (context === "logistics") return "Need route support?";
    if (context === "agency") return "Ready to scope the work?";
  }

  if (fieldKey === "href") {
    return "/work/example or https://example.com";
  }

  return undefined;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const className =
    "w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/25 focus:border-white focus:outline-none";

  return (
    <label className="space-y-2">
      <span className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</span>
      {multiline ? (
        <textarea
          rows={5}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${className} resize-y`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
    </label>
  );
}

function BlockCard({
  title,
  description,
  hint,
  collapsed,
  draggable = false,
  isDropTarget = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onToggleCollapse,
  children,
  onRemove,
  onMoveUp,
  onMoveDown,
  selectedMode = false,
}: {
  title: string;
  description: string;
  hint?: string | null;
  collapsed: boolean;
  draggable?: boolean;
  isDropTarget?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
  onToggleCollapse: () => void;
  children: ReactNode;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  selectedMode?: boolean;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (!draggable) {
          return;
        }

        event.preventDefault();
        onDragOver?.();
      }}
      onDrop={(event) => {
        if (!draggable) {
          return;
        }

        event.preventDefault();
        onDrop?.();
      }}
      className={`rounded-2xl border bg-black/30 p-5 transition ${
        isDropTarget ? "border-white/45 ring-1 ring-white/20" : "border-white/10"
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-white/55">{description}</p>
          {hint ? <p className="text-sm text-amber-100/75">{hint}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {draggable && !selectedMode ? (
            <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/40">
              Drag
            </div>
          ) : null}
          {!selectedMode ? (
            <>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/65 hover:border-white/40 hover:text-white"
              >
                {collapsed ? "Expand" : "Collapse"}
              </button>
              <button
                type="button"
                onClick={onMoveUp}
                className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/65 hover:border-white/40 hover:text-white"
              >
                Up
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/65 hover:border-white/40 hover:text-white"
              >
                Down
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-rose-400/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-300/50"
          >
            Remove
          </button>
        </div>
      </div>
      {!collapsed || selectedMode ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

function ImageSelectionField({
  label,
  imageUrl,
  altText,
  selectedAssetLabel,
  uploading,
  pickerOpen,
  onChangeAltText,
  onOpenPicker,
  onClosePicker,
  onClear,
  onUpload,
  onSelectAsset,
  assets,
}: {
  label: string;
  imageUrl: string;
  altText: string;
  selectedAssetLabel?: string | null;
  uploading: boolean;
  pickerOpen: boolean;
  onChangeAltText: (value: string) => void;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onClear: () => void;
  onUpload: (file: File, altText?: string) => Promise<void>;
  onSelectAsset: (asset: SiteAsset) => void;
  assets: SiteAsset[];
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</p>
        <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={altText || "Selected page image"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white/40">
              No image selected
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenPicker}
          className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/75 hover:border-white/40 hover:text-white"
        >
          Choose From Assets
        </button>
        {imageUrl ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-rose-400/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-300/50"
          >
            Remove Image
          </button>
        ) : null}
      </div>

      {selectedAssetLabel ? <p className="text-xs text-white/45">Using: {selectedAssetLabel}</p> : null}

      <Field
        label="Image alt text"
        value={altText}
        onChange={onChangeAltText}
        placeholder="Describe the image for accessibility"
      />

      {pickerOpen ? (
        <AssetPickerDialog
          assets={assets.filter((asset) => asset.mimeType.startsWith("image/"))}
          selectedUrl={imageUrl}
          uploading={uploading}
          onClose={onClosePicker}
          onUpload={onUpload}
          onSelect={onSelectAsset}
        />
      ) : null}
    </div>
  );
}

function RepeaterEditor({
  label,
  items,
  fields,
  onChange,
  createItem,
  availablePages,
  currentPageKey,
  pageTemplateKey,
  blockType,
}: {
  label: string;
  items: RepeaterItem[];
  fields: RepeaterField[];
  onChange: (items: RepeaterItem[]) => void;
  createItem: () => RepeaterItem;
  availablePages: Pick<AdminPageSummary, "pageKey" | "title" | "slug">[];
  currentPageKey?: string | null;
  pageTemplateKey?: string | null;
  blockType: string;
}) {
  const linkablePages = useMemo(
    () => availablePages.filter((page) => page.pageKey !== currentPageKey),
    [availablePages, currentPageKey]
  );
  const getPageHref = (page: Pick<AdminPageSummary, "slug">) => normalizeInternalPageHref(page.slug);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</p>
        <button
          type="button"
          onClick={() => onChange([...items, createItem()])}
          className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/75 hover:border-white/40 hover:text-white"
        >
          Add Item
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${label}-${index}`}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Item {index + 1}</p>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="rounded-full border border-rose-400/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-300/50"
              >
                Remove
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => {
                if (field.kind === "pageLink") {
                  const linkedPageKeyField = getLinkedPageKeyField(field.key);
                  const storedPageKey = item[linkedPageKeyField] ?? "";
                  const matchedPage =
                    linkablePages.find((page) => page.pageKey === storedPageKey) ??
                    linkablePages.find((page) => getPageHref(page) === (item[field.key] ?? ""));

                  return (
                    <div key={field.key} className="space-y-3 md:col-span-2">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                          Linked site page
                        </label>
                        <select
                          value={matchedPage?.pageKey ?? ""}
                          onChange={(event) => {
                            const selectedPage = linkablePages.find(
                              (page) => page.pageKey === event.target.value
                            );
                            const nextItems = items.map((entry, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...entry,
                                    [field.key]:
                                      selectedPage != null
                                        ? getPageHref(selectedPage)
                                        : entry[field.key] ?? "",
                                    [linkedPageKeyField]: selectedPage?.pageKey ?? "",
                                  }
                                : entry
                            );
                            onChange(nextItems);
                          }}
                          className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white focus:border-white focus:outline-none"
                        >
                          <option value="">Custom path or external URL</option>
                          {linkablePages.map((page) => (
                            <option key={page.pageKey} value={page.pageKey}>
                              {page.title} ({page.slug})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-white/45">
                          Pick an internal page, or leave this on custom and enter a relative path
                          or external URL below.
                        </p>
                      </div>
                      <Field
                        label={field.label}
                        value={item[field.key] ?? ""}
                        onChange={(value) => {
                          const nextItems = items.map((entry, itemIndex) => {
                            if (itemIndex !== index) {
                              return entry;
                            }

                            const selectedPage = linkablePages.find(
                              (page) => page.pageKey === (entry[linkedPageKeyField] ?? "")
                            );

                            return {
                              ...entry,
                              [field.key]: value,
                              [linkedPageKeyField]:
                                selectedPage && getPageHref(selectedPage) === value
                                  ? selectedPage.pageKey
                                  : "",
                            };
                          });
                          onChange(nextItems);
                        }}
                        placeholder={getFieldPlaceholder(pageTemplateKey, blockType, field.key)}
                      />
                      {matchedPage ? (
                        <p className="text-xs text-white/45">
                          Linked to {matchedPage.title}. If this page slug changes, saving this
                          page will refresh the link.
                        </p>
                      ) : (
                        <p className="text-xs text-white/45">
                          Supports values like <span className="text-white/70">/work/echoes</span>{" "}
                          or <span className="text-white/70">https://example.com/case-study</span>.
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <Field
                    key={field.key}
                    label={field.label}
                    value={item[field.key] ?? ""}
                    onChange={(value) => {
                      const nextItems = items.map((entry, itemIndex) =>
                        itemIndex === index ? { ...entry, [field.key]: value } : entry
                      );
                      onChange(nextItems);
                    }}
                    multiline={field.multiline}
                    placeholder={getFieldPlaceholder(pageTemplateKey, blockType, field.key)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManageRepeaterDialog({
  label,
  items,
  fields,
  onChange,
  createItem,
  availablePages,
  currentPageKey,
  pageTemplateKey,
  blockType,
  onClose,
}: {
  label: string;
  items: RepeaterItem[];
  fields: RepeaterField[];
  onChange: (items: RepeaterItem[]) => void;
  createItem: () => RepeaterItem;
  availablePages: Pick<AdminPageSummary, "pageKey" | "title" | "slug">[];
  currentPageKey?: string | null;
  pageTemplateKey?: string | null;
  blockType: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6">
      <div className="flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#080a0d] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Manage content</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{label}</h3>
            <p className="mt-2 text-sm text-white/55">
              Edit repeated content here so the main block editor stays focused.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 hover:border-white/40 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          <RepeaterEditor
            label={label}
            items={items}
            fields={fields}
            onChange={onChange}
            createItem={createItem}
            availablePages={availablePages}
            currentPageKey={currentPageKey}
            pageTemplateKey={pageTemplateKey}
            blockType={blockType}
          />
        </div>
      </div>
    </div>
  );
}

function ImportedBlockEditor({
  block,
  data,
  availablePages,
  currentPageKey,
  onChange,
}: {
  block: PageBlockRecord;
  data: BlockData;
  availablePages: Pick<AdminPageSummary, "pageKey" | "title" | "slug">[];
  currentPageKey?: string | null;
  onChange: (data: BlockData) => void;
}) {
  const schema = importedBlockSchemas[block.type];
  const [managedFieldKey, setManagedFieldKey] = useState<string | null>(null);
  if (!schema) {
    return <UnknownBlockEditor block={block} onChange={onChange} />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-orange-300/20 bg-orange-300/10 px-4 py-3 text-sm text-orange-50/80">
        Imported React source is preserved as provenance. Edit this section through
        safe schema fields; raw JSX is not executed or edited here.
      </div>

      {schema.fields.map((field) => {
        if (field.kind === "text") {
          return (
            <Field
              key={field.key}
              label={field.label}
              value={getString(data, field.key)}
              onChange={(value) => onChange({ ...data, [field.key]: value })}
              multiline={field.multiline}
            />
          );
        }

        if (field.kind === "list") {
          return (
            <Field
              key={field.key}
              label={`${field.label} (one per line)`}
              value={Array.isArray(data[field.key]) ? (data[field.key] as unknown[]).join("\n") : ""}
              onChange={(value) =>
                onChange({
                  ...data,
                  [field.key]: value
                    .split("\n")
                    .map((entry) => entry.trim())
                    .filter(Boolean),
                })
              }
              multiline
            />
          );
        }

        const items = getArrayFieldItems(data, field.key, field.fields);
        return (
          <div key={field.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{field.label}</p>
                <p className="mt-1 text-sm text-white/50">
                  {items.length} item{items.length === 1 ? "" : "s"} configured.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagedFieldKey(field.key)}
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/75 hover:border-white/40 hover:text-white"
              >
                Manage {field.label}
              </button>
            </div>
            {managedFieldKey === field.key ? (
              <ManageRepeaterDialog
                label={field.label}
                items={items}
                fields={field.fields}
                onChange={(nextItems) =>
                  onChange({
                    ...data,
                    [field.key]: applyArrayFieldItems(nextItems),
                  })
                }
                createItem={field.createItem}
                availablePages={availablePages}
                currentPageKey={currentPageKey}
                pageTemplateKey={null}
                blockType={block.type}
                onClose={() => setManagedFieldKey(null)}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AssetPickerDialog({
  assets,
  selectedUrl,
  uploading,
  onSelect,
  onUpload,
  onClose,
}: {
  assets: SiteAsset[];
  selectedUrl: string;
  uploading: boolean;
  onSelect: (asset: SiteAsset) => void;
  onUpload: (file: File, altText?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAltText, setUploadAltText] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0b] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Site Assets</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Choose or upload image</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 hover:border-white/40 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="grid max-h-[calc(80vh-88px)] gap-6 overflow-y-auto p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Upload</p>
              <h4 className="mt-2 text-lg font-semibold text-white">Add a new image</h4>
              <p className="mt-2 text-sm text-white/55">
                Upload directly here if the image is not already in the site library.
              </p>
            </div>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-white/45">Image file</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1 file:text-xs file:uppercase file:tracking-[0.2em] file:text-black"
              />
            </label>

            <Field
              label="Alt text"
              value={uploadAltText}
              onChange={setUploadAltText}
              placeholder="Describe the image for accessibility"
            />

            <button
              type="button"
              disabled={!uploadFile || uploading}
              onClick={async () => {
                if (!uploadFile) return;
                await onUpload(uploadFile, uploadAltText || undefined);
                setUploadFile(null);
                setUploadAltText("");
              }}
              className="w-full rounded-full bg-white px-4 py-3 text-xs uppercase tracking-[0.2em] text-black disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Image"}
            </button>
          </section>

          <section>
            {assets.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
                No image assets are available for this site yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {assets.map((asset) => {
                  const active = asset.url === selectedUrl;
                  const isImage = asset.mimeType.startsWith("image/");

                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => onSelect(asset)}
                      className={`overflow-hidden rounded-2xl border text-left transition ${
                        active
                          ? "border-white bg-white/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/30"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full bg-black/40">
                        {isImage ? (
                          <img
                            src={asset.url}
                            alt={asset.altText ?? asset.filename}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-white/40">
                            {asset.mimeType}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 p-4">
                        <p className="truncate text-sm font-medium text-white">{asset.filename}</p>
                        <p className="text-xs text-white/50">
                          {asset.altText || "No alt text yet"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function UnknownBlockEditor({
  block,
  onChange,
}: {
  block: PageBlockRecord;
  onChange: (data: BlockData) => void;
}) {
  const [rawValue, setRawValue] = useState(() => JSON.stringify(block.data, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setRawValue(JSON.stringify(block.data, null, 2));
    setParseError(null);
  }, [block.data]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/55">
        This section still uses the advanced editor because it does not have a guided
        form yet.
      </p>
      <textarea
        rows={10}
        value={rawValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setRawValue(nextValue);

          try {
            onChange(JSON.parse(nextValue) as BlockData);
            setParseError(null);
          } catch {
            setParseError("This section contains invalid JSON.");
          }
        }}
        className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm text-white focus:border-white focus:outline-none"
      />
      {parseError ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {parseError}
        </div>
      ) : null}
    </div>
  );
}

function PageBlockEditor({
  pageTemplateKey,
  currentPageKey,
  block,
  index,
  mode,
  assets,
  availablePages,
  collapsed,
  uploadingAsset,
  isDropTarget,
  onUploadAsset,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onToggleCollapse,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  selectedMode = false,
}: {
  pageTemplateKey?: string | null;
  currentPageKey?: string | null;
  block: PageBlockRecord;
  index: number;
  mode: EditorMode;
  assets: SiteAsset[];
  availablePages: Pick<AdminPageSummary, "pageKey" | "title" | "slug">[];
  collapsed: boolean;
  uploadingAsset: boolean;
  isDropTarget: boolean;
  onUploadAsset: (file: File, altText?: string) => Promise<void>;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onToggleCollapse: () => void;
  onChange: (data: BlockData) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  selectedMode?: boolean;
}) {
  const title = selectedMode ? getBlockLabel(block.type) : `${index + 1}. ${getBlockLabel(block.type)}`;
  const description = getBlockDescription(block.type);
  const hint = getSectionHint(pageTemplateKey, block.type);
  const data = block.data ?? {};
  const [assetPickerTarget, setAssetPickerTarget] = useState<"hero" | number | null>(null);

  const updateField = (key: string, value: string | boolean) => {
    onChange({
      ...data,
      [key]: value,
    });
  };

  const updateItems = (items: RepeaterItem[]) => {
    onChange({
      ...data,
      items,
    });
  };

  let content: ReactNode;

  if (mode === "advanced") {
    content = <UnknownBlockEditor block={block} onChange={onChange} />;
  } else {
    switch (block.type) {
      case "hero":
        const selectedHeroAsset =
          assets.find((asset) => asset.url === getString(data, "backgroundImage")) ?? null;

        content = (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Headline"
                value={getString(data, "headline")}
                onChange={(value) => updateField("headline", value)}
                placeholder={getFieldPlaceholder(pageTemplateKey, "hero", "headline")}
              />
              <Field
                label="Button label"
                value={getString(data, "primaryCtaLabel")}
                onChange={(value) => updateField("primaryCtaLabel", value)}
              />
              <div className="md:col-span-2">
                <Field
                  label="Supporting text"
                  value={getString(data, "subheadline")}
                  onChange={(value) => updateField("subheadline", value)}
                  multiline
                />
              </div>
              <div className="md:col-span-2">
                <Field
                  label="Button link"
                  value={getString(data, "primaryCtaHref")}
                  onChange={(value) => updateField("primaryCtaHref", value)}
                />
              </div>
            </div>

            <ImageSelectionField
              label="Hero image"
              imageUrl={getString(data, "backgroundImage")}
              altText={getString(data, "backgroundImageAlt")}
              selectedAssetLabel={selectedHeroAsset?.filename ?? null}
              uploading={uploadingAsset}
              pickerOpen={assetPickerTarget === "hero"}
              onOpenPicker={() => setAssetPickerTarget("hero")}
              onClosePicker={() => setAssetPickerTarget(null)}
              onClear={() =>
                onChange({
                  ...data,
                  backgroundImage: "",
                  backgroundImageAlt: "",
                })
              }
              onChangeAltText={(value) => updateField("backgroundImageAlt", value)}
              onUpload={onUploadAsset}
              onSelectAsset={(asset) => {
                onChange({
                  ...data,
                  backgroundImage: asset.url,
                  backgroundImageAlt:
                    getString(data, "backgroundImageAlt") || asset.altText || asset.filename,
                });
                setAssetPickerTarget(null);
              }}
              assets={assets}
            />
          </div>
        );
        break;
      case "richText":
        content = (
          <div className="grid gap-4">
            <Field
              label="Section title"
              value={getString(data, "title")}
              onChange={(value) => updateField("title", value)}
            />
            <Field
              label="Body copy"
              value={getString(data, "body")}
              onChange={(value) => updateField("body", value)}
              multiline
              placeholder={getFieldPlaceholder(pageTemplateKey, "richText", "body")}
            />
          </div>
        );
        break;
      case "features":
        content = (
          <div className="space-y-4">
            <Field
              label="Heading"
              value={getString(data, "heading")}
              onChange={(value) => updateField("heading", value)}
            />
            <RepeaterEditor
              label="Feature items"
              items={getItems(data)}
              fields={[
                { key: "title", label: "Title" },
                { key: "description", label: "Description", multiline: true },
              ]}
              onChange={updateItems}
              createItem={() => ({ title: "Feature", description: "Describe the feature." })}
              availablePages={availablePages}
              currentPageKey={currentPageKey}
              pageTemplateKey={pageTemplateKey}
              blockType="features"
            />
          </div>
        );
        break;
      case "faq":
        content = (
          <div className="space-y-4">
            <Field
              label="Heading"
              value={getString(data, "heading")}
              onChange={(value) => updateField("heading", value)}
            />
            <RepeaterEditor
              label="Questions"
              items={getItems(data)}
              fields={[
                { key: "question", label: "Question" },
                { key: "answer", label: "Answer", multiline: true },
              ]}
              onChange={updateItems}
              createItem={() => ({ question: "Question", answer: "Answer" })}
              availablePages={availablePages}
              currentPageKey={currentPageKey}
              pageTemplateKey={pageTemplateKey}
              blockType="faq"
            />
          </div>
        );
        break;
      case "cta":
        content = (
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Call to action title"
              value={getString(data, "title")}
              onChange={(value) => updateField("title", value)}
              placeholder={getFieldPlaceholder(pageTemplateKey, "cta", "title")}
            />
            <Field
              label="Button label"
              value={getString(data, "label")}
              onChange={(value) => updateField("label", value)}
            />
            <div className="md:col-span-2">
              <Field
                label="Button link"
                value={getString(data, "href")}
                onChange={(value) => updateField("href", value)}
              />
            </div>
          </div>
        );
        break;
      case "contact":
        content = (
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Heading"
              value={getString(data, "heading")}
              onChange={(value) => updateField("heading", value)}
            />
            <Field
              label="Contact email"
              value={getString(data, "email")}
              onChange={(value) => updateField("email", value)}
            />
            <Field
              label="Phone"
              value={getString(data, "phone")}
              onChange={(value) => updateField("phone", value)}
            />
            <Field
              label="Address"
              value={getString(data, "address")}
              onChange={(value) => updateField("address", value)}
              multiline
            />
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white md:col-span-2">
              <input
                type="checkbox"
                checked={getBoolean(data, "formEnabled")}
                onChange={(event) => updateField("formEnabled", event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/40"
              />
              Enable the contact form on this page
            </label>
          </div>
        );
        break;
      case "stats":
        content = (
          <div className="space-y-4">
            <Field
              label="Heading"
              value={getString(data, "heading")}
              onChange={(value) => updateField("heading", value)}
            />
            <RepeaterEditor
              label="Stats"
              items={getItems(data)}
              fields={[
                { key: "label", label: "Label" },
                { key: "value", label: "Value" },
              ]}
              onChange={updateItems}
              createItem={() => ({ label: "Metric", value: "24+" })}
              availablePages={availablePages}
              currentPageKey={currentPageKey}
              pageTemplateKey={pageTemplateKey}
              blockType="stats"
            />
          </div>
        );
        break;
      case "gallery":
        content = (
          <div className="space-y-4">
            <Field
              label="Heading"
              value={getString(data, "heading")}
              onChange={(value) => updateField("heading", value)}
            />
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Images</p>
                <button
                  type="button"
                  onClick={() =>
                    updateItems([
                      ...getItems(data),
                      {
                        imageUrl: "",
                        alt: "",
                        caption: "",
                      },
                    ])
                  }
                  className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/75 hover:border-white/40 hover:text-white"
                >
                  Add Image
                </button>
              </div>

              {getItems(data).map((item, itemIndex) => {
                const selectedAsset =
                  assets.find((asset) => asset.url === (item.imageUrl ?? "")) ?? null;

                return (
                  <div
                    key={`gallery-item-${itemIndex}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">Image {itemIndex + 1}</p>
                      <button
                        type="button"
                        onClick={() =>
                          updateItems(getItems(data).filter((_, indexToKeep) => indexToKeep !== itemIndex))
                        }
                        className="rounded-full border border-rose-400/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-300/50"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="space-y-3">
                        <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.alt || "Selected gallery image"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white/40">
                              No image selected
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setAssetPickerTarget(itemIndex)}
                          className="w-full rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/75 hover:border-white/40 hover:text-white"
                        >
                          Choose From Assets
                        </button>
                        {selectedAsset ? (
                          <p className="text-xs text-white/45">Using: {selectedAsset.filename}</p>
                        ) : null}
                      </div>

                      <div className="space-y-4">
                        <Field
                          label="Alt text"
                          value={item.alt ?? ""}
                          onChange={(value) => {
                            const nextItems = getItems(data).map((entry, currentIndex) =>
                              currentIndex === itemIndex ? { ...entry, alt: value } : entry
                            );
                            updateItems(nextItems);
                          }}
                        />
                        <Field
                          label="Caption"
                          value={item.caption ?? ""}
                          onChange={(value) => {
                            const nextItems = getItems(data).map((entry, currentIndex) =>
                              currentIndex === itemIndex ? { ...entry, caption: value } : entry
                            );
                            updateItems(nextItems);
                          }}
                          multiline
                        />
                      </div>
                    </div>

                    {assetPickerTarget === itemIndex ? (
                      <AssetPickerDialog
                        assets={assets.filter((asset) => asset.mimeType.startsWith("image/"))}
                        selectedUrl={item.imageUrl ?? ""}
                        uploading={uploadingAsset}
                        onClose={() => setAssetPickerTarget(null)}
                        onUpload={onUploadAsset}
                        onSelect={(asset) => {
                          const nextItems = getItems(data).map((entry, currentIndex) =>
                            currentIndex === itemIndex
                              ? {
                                  ...entry,
                                  imageUrl: asset.url,
                                  alt: entry.alt || asset.altText || asset.filename,
                                }
                              : entry
                          );
                          updateItems(nextItems);
                          setAssetPickerTarget(null);
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
        break;
      default:
        content = importedBlockSchemas[block.type] ? (
          <ImportedBlockEditor
            block={block}
            data={data}
            availablePages={availablePages}
            currentPageKey={currentPageKey}
            onChange={onChange}
          />
        ) : (
          <UnknownBlockEditor block={block} onChange={onChange} />
        );
        break;
    }
  }

  return (
    <BlockCard
      title={title}
      description={description}
      hint={hint}
      collapsed={collapsed}
      draggable
      isDropTarget={isDropTarget}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onToggleCollapse={onToggleCollapse}
      onRemove={onRemove}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      selectedMode={selectedMode}
    >
      {content}
    </BlockCard>
  );
}

function PageEditorTopBar({
  page,
  saving,
  publishing,
  prefilling,
  saveState,
  lastSavedAt,
  validationLabel,
  validationTone,
  onSave,
  onPublish,
  onOpenPreview,
  onUploadBrief,
}: {
  page: AdminPageDetail;
  saving: boolean;
  publishing: boolean;
  prefilling: boolean;
  saveState: SaveState;
  lastSavedAt: string | null;
  validationLabel: string;
  validationTone: string;
  onSave: () => void;
  onPublish: () => void;
  onOpenPreview: () => void;
  onUploadBrief: () => void;
}) {
  const saveLabel =
    saveState === "saving" || saving
      ? "Saving..."
      : saveState === "unsaved"
        ? "Unsaved changes"
        : saveState === "failed"
          ? "Save failed"
          : "All changes saved";

  return (
    <header className="z-30 border-b border-white/10 bg-[#05070a]/90 px-5 py-4 backdrop-blur-xl xl:sticky xl:top-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/55">
            <span>Page Editor</span>
            <span>/</span>
            <span className="font-medium text-white">{page.title || "Untitled"}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">
              {page.slug || "/"}
            </span>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
              {page.status === "PUBLISHED" ? "Published" : "Draft"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className={validationTone}>{validationLabel}</span>
            <span className="text-white/25">•</span>
            <span className={saveState === "unsaved" ? "text-amber-100" : "text-emerald-200"}>
              {saveLabel}
            </span>
            <span className="text-white/25">•</span>
            <span className="text-white/45">Last saved {formatSavedAt(lastSavedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenPreview}
            className="rounded-2xl border border-white/15 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/35 hover:text-white"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={onUploadBrief}
            disabled={saving || publishing || prefilling}
            className="rounded-2xl border border-orange-300/25 bg-orange-500/10 px-4 py-2.5 text-sm text-orange-100 transition hover:border-orange-300/45 hover:bg-orange-500/20 disabled:opacity-50"
          >
            {prefilling ? "Preparing..." : "Upload brief"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || publishing}
            className="rounded-2xl border border-white/15 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/35 hover:text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={saving || publishing}
            className="rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {publishing
              ? "Publishing..."
              : validationLabel === "Ready to publish"
                ? "Publish"
                : "Review issues"}
          </button>
        </div>
      </div>
    </header>
  );
}

function PageBlockNavigator({
  blocks,
  selectedBlockId,
  availableBlockTypes,
  newBlockType,
  draggedBlockId,
  dropTargetBlockId,
  onSelect,
  onToggleVisibility,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onChangeNewBlockType,
  onAddBlock,
}: {
  blocks: PageBlockRecord[];
  selectedBlockId: string | null;
  availableBlockTypes: string[];
  newBlockType: string;
  draggedBlockId: string | null;
  dropTargetBlockId: string | null;
  onSelect: (blockId: string) => void;
  onToggleVisibility: (block: PageBlockRecord) => void;
  onDragStart: (blockId: string) => void;
  onDragEnd: () => void;
  onDragOver: (blockId: string) => void;
  onDrop: (blockId: string) => void;
  onChangeNewBlockType: (type: string) => void;
  onAddBlock: () => void;
}) {
  return (
    <aside className="max-h-[calc(100vh-116px)] overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.035] p-4 xl:sticky xl:top-[92px]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/40">Page structure</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Blocks</h2>
          <p className="mt-1 text-sm text-white/50">Click a block to edit it.</p>
        </div>
      </div>

      <div className="space-y-3">
        {blocks.map((block, index) => {
          const active = block.id === selectedBlockId;
          const status = getBlockStatus(block);
          const meta = getStatusMeta(status);
          const isDropTarget = dropTargetBlockId === block.id && draggedBlockId !== block.id;

          return (
            <button
              key={block.id}
              type="button"
              draggable
              onClick={() => onSelect(block.id)}
              onDragStart={() => onDragStart(block.id)}
              onDragEnd={onDragEnd}
              onDragOver={(event) => {
                event.preventDefault();
                onDragOver(block.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                onDrop(block.id);
              }}
              className={`group w-full rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-white/45 bg-white/[0.09] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                  : isDropTarget
                    ? "border-white/35 bg-white/[0.06]"
                    : "border-white/10 bg-black/25 hover:border-white/25 hover:bg-white/[0.055]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="cursor-grab text-white/35 group-active:cursor-grabbing">⋮⋮</span>
                <span className="w-5 text-sm text-white/50">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{getBlockLabel(block.type)}</p>
                  <p className="mt-1 truncate text-xs text-white/45">{block.type}</p>
                </div>
                <span className={`inline-flex items-center gap-2 text-xs ${meta.text}`}>
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleVisibility(block);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onToggleVisibility(block);
                    }
                  }}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-white/30 hover:text-white"
                >
                  {isBlockHidden(block) ? "Show" : "Hide"}
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
                  More
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-4">
        {availableBlockTypes.length > 0 ? (
          <div className="space-y-3">
            <select
              value={newBlockType}
              onChange={(event) => onChangeNewBlockType(event.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
            >
              {availableBlockTypes.map((type) => (
                <option key={type} value={type}>
                  {getBlockLabel(type)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onAddBlock}
              className="w-full rounded-2xl border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:border-white/35 hover:text-white"
            >
              Add block
            </button>
          </div>
        ) : (
          <p className="text-sm text-white/45">
            Add block is unavailable because this template controls its page structure.
          </p>
        )}
      </div>
    </aside>
  );
}

function PreviewInspectorPanel({
  page,
  selectedBlockId,
  inspectorTab,
  previewMode,
  onChangeTab,
  onChangePreviewMode,
  onPageChange,
  onOpenPreview,
}: {
  page: AdminPageDetail;
  selectedBlockId: string | null;
  inspectorTab: InspectorTab;
  previewMode: PreviewMode;
  onChangeTab: (tab: InspectorTab) => void;
  onChangePreviewMode: (mode: PreviewMode) => void;
  onPageChange: (page: AdminPageDetail) => void;
  onOpenPreview: () => void;
}) {
  const previewWidth =
    previewMode === "mobile" ? "max-w-[390px]" : previewMode === "tablet" ? "max-w-[760px]" : "max-w-full";

  return (
    <aside className="max-h-[calc(100vh-116px)] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] xl:sticky xl:top-[92px]">
      <div className="flex border-b border-white/10">
        {(["preview", "seo", "history", "settings"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChangeTab(tab)}
            className={`flex-1 px-4 py-3 text-sm capitalize transition ${
              inspectorTab === tab ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-h-[calc(100vh-170px)] overflow-y-auto p-4">
        {inspectorTab === "preview" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-2xl border border-white/10 bg-black/25 p-1">
                {(["desktop", "tablet", "mobile"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onChangePreviewMode(mode)}
                    className={`rounded-xl px-3 py-2 text-xs capitalize ${
                      previewMode === mode ? "bg-white text-black" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => undefined}
                  className="rounded-2xl border border-white/15 px-3 py-2 text-xs text-white/70 hover:border-white/35 hover:text-white"
                >
                  Refresh preview
                </button>
                <button
                  type="button"
                  onClick={onOpenPreview}
                  className="rounded-2xl border border-white/15 px-3 py-2 text-xs text-white/70 hover:border-white/35 hover:text-white"
                >
                  Open full preview
                </button>
              </div>
            </div>

            {selectedBlockId ? (
              <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm text-sky-100/85">
                Preview is scoped to the current draft. Selected block:{" "}
                {getBlockLabel(page.content.blocks.find((block) => block.id === selectedBlockId)?.type ?? "")}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-3xl border border-white/10 bg-black p-3">
              <div className={`mx-auto min-h-[520px] overflow-hidden rounded-2xl bg-[#f2eee4] ${previewWidth}`}>
                <PageBlocksRenderer blocks={page.content.blocks} />
              </div>
            </div>
          </div>
        ) : null}

        {inspectorTab === "seo" ? (
          <div className="space-y-4">
            <Field
              label="SEO title"
              value={page.seoTitle ?? ""}
              onChange={(value) => onPageChange({ ...page, seoTitle: value || null })}
            />
            <Field
              label="Meta description"
              value={page.seoDescription ?? ""}
              onChange={(value) => onPageChange({ ...page, seoDescription: value || null })}
              multiline
            />
            <Field
              label="Slug"
              value={page.slug}
              onChange={(value) => onPageChange({ ...page, slug: value })}
            />
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Social preview</p>
              <h3 className="mt-3 text-base font-semibold text-white">{page.seoTitle || page.title}</h3>
              <p className="mt-2 text-sm text-white/55">{page.seoDescription || "No meta description yet."}</p>
            </div>
          </div>
        ) : null}

        {inspectorTab === "history" ? (
          <div className="space-y-4 text-sm text-white/65">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-white/40">Draft revision</p>
              <p className="mt-1 text-lg font-semibold text-white">{page.draftRevisionNumber ?? "None"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-white/40">Published revision</p>
              <p className="mt-1 text-lg font-semibold text-white">{page.publishedRevisionNumber ?? "None"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-white/40">Last edited</p>
              <p className="mt-1 text-white">{formatSavedAt(page.updatedAt)}</p>
            </div>
            <button
              type="button"
              disabled
              className="w-full rounded-2xl border border-white/10 px-4 py-3 text-white/35"
            >
              Restore previous version unavailable in this phase
            </button>
          </div>
        ) : null}

        {inspectorTab === "settings" ? (
          <div className="space-y-4 text-sm">
            <Field
              label="Page title"
              value={page.title}
              onChange={(value) => onPageChange({ ...page, title: value })}
            />
            <div className={`rounded-2xl border p-4 ${getLineagePanelTone(page)}`}>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Template source</p>
              <h3 className="mt-2 font-semibold">{getLineageStatusLabel(page)}</h3>
              <p className="mt-2 opacity-80">{getLineageSource(page)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-white/65">
              <p>Status: <span className="text-white">{page.status}</span></p>
              <p className="mt-2">Visibility: <span className="text-white">Public when published</span></p>
              <p className="mt-2">Page key: <span className="text-white">{page.pageKey}</span></p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function PublishConfirmationDialog({
  page,
  validationLabel,
  issues,
  onClose,
  onPublish,
  publishing,
}: {
  page: AdminPageDetail;
  validationLabel: string;
  issues: ValidationIssue[];
  onClose: () => void;
  onPublish: () => void;
  publishing: boolean;
}) {
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#080a0d] p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.24em] text-white/40">Publish page</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">{page.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Publishing saves the current draft and makes this page live. Template updates will not overwrite this site-owned page.
        </p>
        <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
          <p>Validation: <span className="text-white">{validationLabel}</span></p>
          <p>Changed blocks: <span className="text-white">{page.content.blocks.length}</span></p>
          <p>Warnings: <span className="text-white">{warningCount}</span></p>
          <p>SEO title: <span className="text-white">{page.seoTitle || page.title}</span></p>
          <p>Preview link: <span className="text-white">{page.slug || "/"}</span></p>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/15 px-4 py-2.5 text-sm text-white/75 hover:border-white/35 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing}
            className="rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {publishing ? "Publishing..." : "Publish page"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ValidationIssuesDrawer({
  page,
  issues,
  onClose,
  onSelectBlock,
  onOpenPublish,
}: {
  page: AdminPageDetail;
  issues: ValidationIssue[];
  onClose: () => void;
  onSelectBlock: (blockId: string) => void;
  onOpenPublish: () => void;
}) {
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const notes = issues.filter((issue) => issue.severity === "info");

  return (
    <div className="fixed inset-0 z-50 bg-black/65">
      <div className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#080a0d] shadow-2xl">
        <div className="border-b border-white/10 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-100">Validation</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Review page issues</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            These checks are advisory. Saving remains available, and publishing still requires confirmation.
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-2xl font-semibold text-white">{page.content.blocks.length}</p>
              <p className="mt-1 text-xs text-white/45">Blocks</p>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="text-2xl font-semibold text-amber-100">{warnings.length}</p>
              <p className="mt-1 text-xs text-amber-100/60">Warnings</p>
            </div>
            <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-4">
              <p className="text-2xl font-semibold text-sky-100">{notes.length}</p>
              <p className="mt-1 text-xs text-sky-100/60">Notes</p>
            </div>
          </div>

          {issues.length === 0 ? (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
              No issues were found. You can open the publish confirmation when ready.
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`rounded-2xl border p-4 ${
                    issue.severity === "warning"
                      ? "border-amber-300/20 bg-amber-300/10"
                      : "border-white/10 bg-white/[0.035]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{issue.label}</p>
                      <p className="mt-1 text-sm leading-relaxed text-white/55">{issue.description}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        issue.severity === "warning"
                          ? "border-amber-300/25 text-amber-100"
                          : "border-white/10 text-white/45"
                      }`}
                    >
                      {issue.severity}
                    </span>
                  </div>
                  {issue.blockId ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectBlock(issue.blockId ?? "");
                        onClose();
                      }}
                      className="mt-3 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:border-white/35 hover:text-white"
                    >
                      Open block
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/15 px-4 py-2.5 text-sm text-white/75 hover:border-white/35 hover:text-white"
          >
            Continue editing
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPublish();
            }}
            className="rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
          >
            Open publish confirmation
          </button>
        </div>
      </div>
    </div>
  );
}

function PrefillReviewDialog({
  suggestions,
  selectedMetadata,
  selectedSuggestionKeys,
  deletingBrief,
  onToggleMetadata,
  onToggleBlock,
  onDeleteBrief,
  onClose,
  onApply,
}: {
  suggestions: AdminPagePrefillSuggestion;
  selectedMetadata: PrefillMetadataKey[];
  selectedSuggestionKeys: PrefillSuggestionKey[];
  deletingBrief: boolean;
  onToggleMetadata: (key: PrefillMetadataKey) => void;
  onToggleBlock: (suggestionKey: PrefillSuggestionKey) => void;
  onDeleteBrief: () => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const metadataEntries = (["title", "seoTitle", "seoDescription"] as const)
    .map((key) => ({ key, value: suggestions.page[key] }))
    .filter((entry) => Boolean(entry.value));
  const analysis = suggestions.analysis;
  const hasAnalysis =
    Boolean(analysis?.brandName) ||
    Boolean(analysis?.positioning) ||
    Boolean(analysis?.tone) ||
    Boolean(analysis?.audience.length) ||
    Boolean(analysis?.services.length) ||
    Boolean(analysis?.notes.length);
  const artifacts = suggestions.artifacts ?? [];
  const hasActiveArtifacts = artifacts.some((artifact) => artifact.status === "ACTIVE");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#080a0d] p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.24em] text-orange-200">AI draft prefill</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Review suggested updates</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Choose what to apply to this draft. Nothing is saved or published until you use the editor controls.
        </p>

        {artifacts.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Uploaded brief files</h3>
                <p className="mt-1 text-sm text-white/55">
                  Raw files stay in private storage for up to 30 days unless you delete them now.
                </p>
              </div>
              <button
                type="button"
                onClick={onDeleteBrief}
                disabled={!hasActiveArtifacts || deletingBrief}
                className="rounded-2xl border border-white/15 px-4 py-2.5 text-sm text-white/75 hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingBrief ? "Deleting brief..." : "Delete brief now"}
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {artifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{artifact.name}</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-white/45">
                      {artifact.status}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/45">
                      {Math.max(1, Math.round(artifact.sizeBytes / 1024))} KB
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/45">
                    {artifact.deletedAt
                      ? `Deleted ${new Date(artifact.deletedAt).toLocaleString()}`
                      : artifact.retainedUntil
                      ? `Retained until ${new Date(artifact.retainedUntil).toLocaleString()}`
                      : `Expires ${new Date(artifact.expiresAt).toLocaleString()}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {hasAnalysis && analysis ? (
          <div className="mt-6 rounded-2xl border border-orange-300/15 bg-orange-300/[0.06] p-4">
            <h3 className="text-sm font-semibold text-white">AI interpreted this brief as</h3>
            <div className="mt-4 grid gap-4 text-sm text-white/70 md:grid-cols-2">
              {analysis.brandName ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">Brand</p>
                  <p className="mt-1 text-white">{analysis.brandName}</p>
                </div>
              ) : null}
              {analysis.tone ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">Tone</p>
                  <p className="mt-1 text-white">{analysis.tone}</p>
                </div>
              ) : null}
              {analysis.positioning ? (
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">Positioning</p>
                  <p className="mt-1 leading-6">{analysis.positioning}</p>
                </div>
              ) : null}
              {analysis.services.length > 0 ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">Services</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {analysis.services.map((service) => (
                      <span key={service} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/75">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {analysis.audience.length > 0 ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">Audience</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {analysis.audience.map((audience) => (
                      <span key={audience} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/75">
                        {audience}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {analysis.notes.length > 0 ? (
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">Mapping notes</p>
                  <ul className="mt-2 space-y-1.5">
                    {analysis.notes.map((note) => (
                      <li key={note} className="leading-6">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {metadataEntries.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold text-white">Page metadata</h3>
            <div className="mt-3 space-y-3">
              {metadataEntries.map((entry) => (
                <label key={entry.key} className="flex gap-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={selectedMetadata.includes(entry.key)}
                    onChange={() => onToggleMetadata(entry.key)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-xs uppercase tracking-[0.18em] text-white/35">{entry.key}</span>
                    <span className="mt-1 block">{entry.value}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {suggestions.blocks.length > 0 ? (
            suggestions.blocks.map((suggestion, index) => {
              const suggestionKey = prefillSuggestionKey(suggestion.blockId, index);
              return (
                <label
                  key={suggestionKey}
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSuggestionKeys.includes(suggestionKey)}
                      onChange={() => onToggleBlock(suggestionKey)}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{suggestion.label}</span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/40">
                          {suggestion.blockType}
                        </span>
                        <span className="rounded-full border border-orange-300/20 px-2 py-0.5 text-xs text-orange-100">
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>
                      <p className="mt-2 leading-6">{suggestion.summary}</p>
                      {suggestion.notes ? <p className="mt-2 text-xs text-white/45">{suggestion.notes}</p> : null}
                    </div>
                  </div>
                </label>
              );
            })
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
              No block suggestions were returned for this brief.
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/15 px-4 py-2.5 text-sm text-white/75 hover:border-white/35 hover:text-white"
          >
            Reject all
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={selectedMetadata.length === 0 && selectedSuggestionKeys.length === 0}
            className="rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            Apply selected
          </button>
        </div>
      </div>
    </div>
  );
}

export function PageEditor() {
  const prefillInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const { pageKey } = useParams<{ pageKey: string }>();
  const [page, setPage] = useState<AdminPageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [deletingPrefillBrief, setDeletingPrefillBrief] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBlockType, setNewBlockType] = useState("");
  const [mode, setMode] = useState<EditorMode>("basic");
  const [assets, setAssets] = useState<SiteAsset[]>([]);
  const [sitePages, setSitePages] = useState<AdminPageSummary[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("preview");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [issuesDialogOpen, setIssuesDialogOpen] = useState(false);
  const [prefillSuggestions, setPrefillSuggestions] = useState<AdminPagePrefillSuggestion | null>(null);
  const [selectedPrefillMetadata, setSelectedPrefillMetadata] = useState<PrefillMetadataKey[]>([]);
  const [selectedPrefillSuggestionKeys, setSelectedPrefillSuggestionKeys] = useState<PrefillSuggestionKey[]>([]);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTargetBlockId, setDropTargetBlockId] = useState<string | null>(null);

  const availableBlockTypes = useMemo(
    () => page?.allowedBlockTypes ?? [],
    [page?.allowedBlockTypes]
  );
  const adminAiPageContext = useMemo(
    () =>
      page
        ? {
            pageEditor: {
              pageKey: page.pageKey,
              title: page.title,
              slug: page.slug,
              pageTemplateKey: page.pageTemplateKey ?? null,
              allowedBlockTypes: page.allowedBlockTypes,
              blockTypes: page.content.blocks.map((block) => block.type),
            },
          }
        : null,
    [page]
  );

  useAdminAiPageContext(adminAiPageContext);

  useEffect(() => {
    if (!pageKey) {
      setError("Missing page key.");
      setLoading(false);
      return;
    }

    const activePageKey = pageKey;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [nextPage, nextAssets, nextSitePages, nextPrefillReview] = await Promise.all([
          getAdminPageDraft(activePageKey),
          listAdminAssets(),
          listAdminPages(),
          getLatestPagePrefillReview(activePageKey),
        ]);

        if (cancelled) {
          return;
        }

        setPage({
          ...nextPage,
          content: {
            blocks: syncLinkedPageHrefsInBlocks(nextPage.content.blocks, nextSitePages),
          },
        });
        setAssets(nextAssets);
        setSitePages(nextSitePages);
        setNewBlockType(nextPage.allowedBlockTypes[0] ?? "");
        setSelectedBlockId(nextPage.content.blocks[0]?.id ?? null);
        setLastSavedAt(nextPage.updatedAt);
        setSaveState("saved");
        setPrefillSuggestions(nextPrefillReview);
        if (nextPrefillReview) {
          const initialSelection = getInitialPrefillSelectionState(nextPrefillReview);
          setSelectedPrefillMetadata(initialSelection.metadata);
          setSelectedPrefillSuggestionKeys(initialSelection.suggestionKeys);
        } else {
          setSelectedPrefillMetadata([]);
          setSelectedPrefillSuggestionKeys([]);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          navigate("/admin/login", { replace: true });
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load page.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [admin?.currentSite?.id, navigate, pageKey]);

  const updateBlock = (blockId: string, nextData: BlockData) => {
    setSaveState("unsaved");
    setPage((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        content: {
          blocks: current.content.blocks.map((block) =>
            block.id === blockId ? { ...block, data: nextData } : block
          ),
        },
      };
    });
  };

  const reorderBlocks = (fromBlockId: string, toBlockId: string) => {
    if (fromBlockId === toBlockId) {
      return;
    }

    setSaveState("unsaved");
    setPage((current) => {
      if (!current) {
        return current;
      }

      const blocks = [...current.content.blocks];
      const fromIndex = blocks.findIndex((block) => block.id === fromBlockId);
      const toIndex = blocks.findIndex((block) => block.id === toBlockId);

      if (fromIndex === -1 || toIndex === -1) {
        return current;
      }

      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);

      return {
        ...current,
        content: {
          blocks,
        },
      };
    });
  };

  const persistDraft = async () => {
    if (!page) {
      return null;
    }

    setSaveState("saving");
    const syncedBlocks = syncLinkedPageHrefsInBlocks(page.content.blocks, sitePages);
    const updated = await saveAdminPageDraft(page.pageKey, {
      title: page.title,
      slug: page.slug,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      content: { blocks: syncedBlocks },
    });

    setPage(updated);
    setLastSavedAt(updated.updatedAt);
    setSaveState("saved");
    return updated;
  };

  const handleAssetUpload = async (file: File, altText?: string) => {
    setUploadingAsset(true);
    try {
      const asset = await uploadAdminAsset(file, altText);
      setAssets((current) => [asset, ...current]);
      toast.success("Image uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image.");
      throw err;
    } finally {
      setUploadingAsset(false);
    }
  };

  const handlePrefillFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!page || files.length === 0) {
      return;
    }
    if (files.length > MAX_PREFILL_FILES) {
      toast.error(`Upload up to ${MAX_PREFILL_FILES} brief files.`);
      return;
    }
    const oversized = files.find((file) => file.size > MAX_PREFILL_FILE_BYTES);
    if (oversized) {
      toast.error(`${oversized.name} is larger than 8 MB.`);
      return;
    }

    setPrefilling(true);
    setError(null);
    try {
      const uploadFiles = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl: await readFileAsDataUrl(file),
        }))
      );
      const artifacts = await uploadPagePrefillArtifacts({
        pageKey: page.pageKey,
        files: uploadFiles,
      });
      const suggestions = await getPagePrefillSuggestions(
        page.pageKey,
        artifacts.map((artifact) => artifact.id)
      );
      const initialSelection = getInitialPrefillSelectionState(suggestions);
      setPrefillSuggestions(suggestions);
      setSelectedPrefillMetadata(initialSelection.metadata);
      setSelectedPrefillSuggestionKeys(initialSelection.suggestionKeys);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to prepare prefill suggestions.";
      setError(message);
      toast.error(message);
    } finally {
      setPrefilling(false);
    }
  };

  const togglePrefillMetadata = (key: PrefillMetadataKey) => {
    setSelectedPrefillMetadata((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
    );
  };

  const togglePrefillBlock = (suggestionKey: PrefillSuggestionKey) => {
    setSelectedPrefillSuggestionKeys((current) =>
      current.includes(suggestionKey) ? current.filter((entry) => entry !== suggestionKey) : [...current, suggestionKey]
    );
  };

  const applyPrefillSuggestions = async () => {
    if (!prefillSuggestions || !page) {
      return;
    }
    if (selectedPrefillMetadata.length === 0 && selectedPrefillSuggestionKeys.length === 0) {
      toast.error("Select at least one AI suggestion to apply.");
      return;
    }

    const selectedSuggestionIds = prefillSuggestions.blocks
      .map((suggestion, index) =>
        selectedPrefillSuggestionKeys.includes(prefillSuggestionKey(suggestion.blockId, index))
          ? suggestion.id
          : null
      )
      .filter((id): id is string => Boolean(id));

    const nextPage = applySelectedPrefillSuggestionsToPage(
      page,
      prefillSuggestions,
      selectedPrefillMetadata,
      selectedPrefillSuggestionKeys
    );

    setPage(nextPage);
    setPrefillSuggestions(null);
    setSaveState("saving");
    setSaving(true);

    try {
      const updated = await saveAdminPageDraft(page.pageKey, {
        title: nextPage.title,
        slug: nextPage.slug,
        seoTitle: nextPage.seoTitle,
        seoDescription: nextPage.seoDescription,
        content: { blocks: syncLinkedPageHrefsInBlocks(nextPage.content.blocks, sitePages) },
      });
      setPage(updated);
      setLastSavedAt(updated.updatedAt);
      setSaveState("saved");
      setSelectedPrefillMetadata([]);
      setSelectedPrefillSuggestionKeys([]);
      toast.success("Selected AI suggestions were applied to the draft.");
    } catch (err) {
      setSaveState("failed");
      const message =
        err instanceof Error
          ? err.message
          : "AI suggestions were applied locally, but saving the draft failed.";
      setError(message);
      toast.error(message);
      return;
    } finally {
      setSaving(false);
    }

    if (prefillSuggestions.runId) {
      try {
        await recordPagePrefillApplied(page.pageKey, prefillSuggestions.runId, {
          selectedMetadata: selectedPrefillMetadata,
          selectedSuggestionIds,
          appliedPatch: {
            selectedSuggestionKeys: selectedPrefillSuggestionKeys,
            selectedMetadata: selectedPrefillMetadata,
          },
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Draft saved, but AI review tracking failed.");
      }
    }
  };

  const rejectPrefillSuggestions = async () => {
    if (prefillSuggestions?.runId && page) {
      try {
        await recordPagePrefillRejected(page.pageKey, prefillSuggestions.runId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to record rejected AI suggestions.");
      }
    }
    setPrefillSuggestions(null);
    setSelectedPrefillMetadata([]);
    setSelectedPrefillSuggestionKeys([]);
  };

  const handleDeletePrefillBrief = async () => {
    if (!prefillSuggestions?.runId || !page) {
      return;
    }

    setDeletingPrefillBrief(true);
    try {
      const updatedSuggestions = await deletePagePrefillBrief(page.pageKey, prefillSuggestions.runId);
      if (updatedSuggestions) {
        setPrefillSuggestions(updatedSuggestions);
      }
      toast.success("Raw brief files were deleted from private storage.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the uploaded brief.");
    } finally {
      setDeletingPrefillBrief(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const updated = await persistDraft();
      if (updated) {
        toast.success("Draft saved.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save page.";
      setError(message);
      setSaveState("failed");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!page) {
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const saved = await persistDraft();
      if (!saved) {
        return;
      }
      const updated = await publishAdminPage(page.pageKey);
      setPage(updated);
      setLastSavedAt(updated.updatedAt);
      setSaveState("saved");
      setPublishDialogOpen(false);
      toast.success("Page published.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to publish page.";
      setError(message);
      setSaveState("failed");
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  const addBlock = () => {
    if (!page || !newBlockType) {
      return;
    }

    const id = `${newBlockType}-${page.content.blocks.length + 1}`;
    const nextBlock: PageBlockRecord = {
      id,
      type: newBlockType,
      data: blockDataDefaults(newBlockType),
    };

    setPage({
      ...page,
      content: {
        blocks: [...page.content.blocks, nextBlock],
      },
    });
    setSelectedBlockId(id);
    setSaveState("unsaved");
  };

  if (loading) {
    return <div className="px-6 py-8 text-sm text-white/60">Loading page...</div>;
  }

  if (error && !page) {
    if (pageKey === "home") {
      return (
        <div className="rounded-3xl border border-amber-300/25 bg-amber-300/10 p-6 text-sm text-amber-50">
          <p className="text-base font-semibold">Block-based homepage is unavailable.</p>
          <p className="mt-2 max-w-2xl text-amber-50/75">
            This site may still rely on the deprecated section-based homepage editor. Legacy content remains available for compatibility.
          </p>
          <Link
            to="/admin/pages/home/legacy"
            className="mt-4 inline-flex rounded-full border border-amber-200/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-50 hover:border-amber-100"
          >
            Open legacy editor
          </Link>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-sm text-rose-100">
        {error}
      </div>
    );
  }

  if (!page) {
    return null;
  }

  const selectedBlock =
    page.content.blocks.find((block) => block.id === selectedBlockId) ??
    page.content.blocks[0] ??
    null;
  const selectedBlockIndex = selectedBlock
    ? page.content.blocks.findIndex((block) => block.id === selectedBlock.id)
    : -1;
  const validation = getValidationSummary(page.content.blocks);
  const validationIssues = getValidationIssues(page);
  const hasPublishWarnings = validationIssues.some((issue) => issue.severity === "warning");

  const updatePageDraft = (nextPage: AdminPageDetail) => {
    setPage(nextPage);
    setSaveState("unsaved");
  };

  const openPreview = () => {
    const href = page.slug?.startsWith("/") ? page.slug : `/${page.slug || ""}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const toggleBlockVisibility = (block: PageBlockRecord) => {
    updateBlock(block.id, {
      ...block.data,
      hidden: !isBlockHidden(block),
    });
  };

  const removeSelectedBlock = () => {
    if (!selectedBlock) {
      return;
    }

    const nextBlocks = page.content.blocks.filter((entry) => entry.id !== selectedBlock.id);
    setPage({
      ...page,
      content: {
        blocks: nextBlocks,
      },
    });
    setSelectedBlockId(nextBlocks[Math.max(0, selectedBlockIndex - 1)]?.id ?? null);
    setSaveState("unsaved");
  };

  const moveSelectedBlock = (direction: -1 | 1) => {
    if (!selectedBlock || selectedBlockIndex === -1) {
      return;
    }

    const targetIndex = selectedBlockIndex + direction;
    if (targetIndex < 0 || targetIndex >= page.content.blocks.length) {
      return;
    }

    const next = [...page.content.blocks];
    [next[selectedBlockIndex], next[targetIndex]] = [next[targetIndex], next[selectedBlockIndex]];
    setPage({ ...page, content: { blocks: next } });
    setSaveState("unsaved");
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-white">
      <PageEditorTopBar
        page={page}
        saving={saving}
        publishing={publishing}
        prefilling={prefilling}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        validationLabel={validation.label}
        validationTone={validation.tone}
        onSave={handleSave}
        onPublish={() =>
          hasPublishWarnings ? setIssuesDialogOpen(true) : setPublishDialogOpen(true)
        }
        onOpenPreview={openPreview}
        onUploadBrief={() => prefillInputRef.current?.click()}
      />
      <input
        ref={prefillInputRef}
        type="file"
        multiple
        accept={PREFILL_ACCEPT}
        className="hidden"
        onChange={(event) => {
          void handlePrefillFilesSelected(event);
        }}
      />

      <main className="grid gap-5 px-5 py-5 xl:grid-cols-[280px_minmax(0,1fr)_420px] 2xl:grid-cols-[300px_minmax(0,1fr)_500px]">
        <PageBlockNavigator
          blocks={page.content.blocks}
          selectedBlockId={selectedBlock?.id ?? null}
          availableBlockTypes={availableBlockTypes}
          newBlockType={newBlockType}
          draggedBlockId={draggedBlockId}
          dropTargetBlockId={dropTargetBlockId}
          onSelect={setSelectedBlockId}
          onToggleVisibility={toggleBlockVisibility}
          onDragStart={(blockId) => {
            setDraggedBlockId(blockId);
            setDropTargetBlockId(blockId);
          }}
          onDragEnd={() => {
            setDraggedBlockId(null);
            setDropTargetBlockId(null);
          }}
          onDragOver={setDropTargetBlockId}
          onDrop={(blockId) => {
            if (draggedBlockId) {
              reorderBlocks(draggedBlockId, blockId);
            }
            setDraggedBlockId(null);
            setDropTargetBlockId(null);
          }}
          onChangeNewBlockType={setNewBlockType}
          onAddBlock={addBlock}
        />

        <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Editing</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">
                {selectedBlock ? getBlockLabel(selectedBlock.type) : "No block selected"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/55">
                {selectedBlock
                  ? getBlockDescription(selectedBlock.type)
                  : "Select a block from the page structure to edit its fields."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-white/15 bg-black/30 p-1">
                {(["basic", "advanced"] as const).map((entryMode) => (
                  <button
                    key={entryMode}
                    type="button"
                    onClick={() => setMode(entryMode)}
                    className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                      mode === entryMode ? "bg-white text-black" : "text-white/65 hover:text-white"
                    }`}
                  >
                    {entryMode}
                  </button>
                ))}
              </div>
              {selectedBlock ? (
                <span className={`rounded-full border border-white/10 px-3 py-2 text-xs ${getStatusMeta(getBlockStatus(selectedBlock)).text}`}>
                  {getStatusMeta(getBlockStatus(selectedBlock)).label}
                </span>
              ) : null}
            </div>
          </div>

          {selectedBlock ? (
            <PageBlockEditor
              key={selectedBlock.id}
              pageTemplateKey={page.pageTemplateKey}
              currentPageKey={page.pageKey}
              block={selectedBlock}
              index={selectedBlockIndex}
              mode={mode}
              assets={assets}
              availablePages={sitePages}
              collapsed={false}
              uploadingAsset={uploadingAsset}
              isDropTarget={false}
              selectedMode
              onUploadAsset={handleAssetUpload}
              onDragStart={() => undefined}
              onDragEnd={() => undefined}
              onDragOver={() => undefined}
              onDrop={() => undefined}
              onToggleCollapse={() => undefined}
              onChange={(data) => updateBlock(selectedBlock.id, data)}
              onRemove={removeSelectedBlock}
              onMoveUp={() => moveSelectedBlock(-1)}
              onMoveDown={() => moveSelectedBlock(1)}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-sm text-white/55">
              This page does not have editable content blocks yet.
            </div>
          )}

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </section>

        <PreviewInspectorPanel
          page={page}
          selectedBlockId={selectedBlock?.id ?? null}
          inspectorTab={inspectorTab}
          previewMode={previewMode}
          onChangeTab={setInspectorTab}
          onChangePreviewMode={setPreviewMode}
          onPageChange={updatePageDraft}
          onOpenPreview={openPreview}
        />
      </main>

      {publishDialogOpen ? (
        <PublishConfirmationDialog
          page={page}
          validationLabel={validation.label}
          issues={validationIssues}
          publishing={publishing}
          onClose={() => setPublishDialogOpen(false)}
          onPublish={handlePublish}
        />
      ) : null}

      {issuesDialogOpen ? (
        <ValidationIssuesDrawer
          page={page}
          issues={validationIssues}
          onClose={() => setIssuesDialogOpen(false)}
          onSelectBlock={setSelectedBlockId}
          onOpenPublish={() => setPublishDialogOpen(true)}
        />
      ) : null}

      {prefillSuggestions ? (
        <PrefillReviewDialog
          suggestions={prefillSuggestions}
          selectedMetadata={selectedPrefillMetadata}
          selectedSuggestionKeys={selectedPrefillSuggestionKeys}
          deletingBrief={deletingPrefillBrief}
          onToggleMetadata={togglePrefillMetadata}
          onToggleBlock={togglePrefillBlock}
          onDeleteBrief={() => void handleDeletePrefillBrief()}
          onClose={() => void rejectPrefillSuggestions()}
          onApply={() => void applyPrefillSuggestions()}
        />
      ) : null}
    </div>
  );
}
