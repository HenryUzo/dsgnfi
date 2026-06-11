import crypto from "crypto";
import path from "path";
import yauzl from "yauzl";
import { Readable } from "stream";

import type { Prisma, PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import type {
  EasyInputMessage,
  ResponseFormatTextJSONSchemaConfig,
  ResponseInputContent,
} from "openai/resources/responses/responses";

import { env } from "../config/env";
import { MissingOpenAIKeyError } from "./adminAi";
import { redactSensitiveText } from "./adminAiRedaction";
import { deleteObject, getObjectBytes, putObject } from "./storage";

const MAX_PREFILL_FILES = 3;
const MAX_PREFILL_FILE_BYTES = 8 * 1024 * 1024;
const PREFILL_ARTIFACT_TTL_MS = 24 * 60 * 60 * 1000;

const acceptedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type BlockFieldSchema = {
  key: string;
  label: string;
  kind: "text" | "list" | "repeater" | "link" | "media";
  itemFields?: Array<{ key: string; label: string; kind: "text" | "link" | "media" }>;
};

type BlockSchemaMetadata = {
  label: string;
  description: string;
  semanticTarget: string;
  fields: BlockFieldSchema[];
};

const importedBlockSchemaMetadata: Record<string, BlockSchemaMetadata> = {
  blitHeroCollage: {
    label: "Blit Hero Collage",
    description: "Top-of-page hero with eyebrow, large headline, caption, and supporting collage images.",
    semanticTarget: "Brand positioning, first impression, what the studio is, and a short supporting line.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", kind: "text" },
      { key: "headline", label: "Headline", kind: "text" },
      { key: "caption", label: "Caption", kind: "text" },
      {
        key: "images",
        label: "Collage images",
        kind: "repeater",
        itemFields: [
          { key: "imageUrl", label: "Image URL", kind: "media" },
          { key: "alt", label: "Alt text", kind: "text" },
        ],
      },
    ],
  },
  blitFeaturedWork: {
    label: "Blit Featured Work",
    description: "Homepage selected work section with introduction, CTA, and featured projects.",
    semanticTarget: "Selected projects, flagship case studies, proof of capability, notable clients, or standout work.",
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "title", label: "Title", kind: "text" },
      { key: "ctaLabel", label: "CTA label", kind: "link" },
      { key: "ctaHref", label: "CTA link", kind: "link" },
      {
        key: "projects",
        label: "Projects",
        kind: "repeater",
        itemFields: [
          { key: "title", label: "Title", kind: "text" },
          { key: "category", label: "Category", kind: "text" },
          { key: "year", label: "Year", kind: "text" },
          { key: "description", label: "Description", kind: "text" },
          { key: "image", label: "Image URL", kind: "media" },
          { key: "href", label: "Case study link", kind: "link" },
          { key: "location", label: "Location", kind: "text" },
        ],
      },
    ],
  },
  blitEditorialStatement: {
    label: "Blit Editorial Statement",
    description: "Large editorial statement section with eyebrow, title, and body copy.",
    semanticTarget: "Studio philosophy, belief statement, approach, or manifesto-style copy.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", kind: "text" },
      { key: "title", label: "Title", kind: "text" },
      { key: "body", label: "Body", kind: "text" },
    ],
  },
  blitVideoSection: {
    label: "Blit Video Section",
    description: "Media-led section for a featured film or moving-image asset.",
    semanticTarget: "Flagship video, motion-led highlight, or immersive showcase asset.",
    fields: [
      { key: "title", label: "Title", kind: "text" },
      { key: "videoUrl", label: "Video URL", kind: "media" },
    ],
  },
  blitCapabilitiesGrid: {
    label: "Blit Capabilities Grid",
    description: "Grid of capabilities with optional supporting image and descriptions.",
    semanticTarget: "Services, capabilities, disciplines, or areas of expertise.",
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "imageUrl", label: "Image URL", kind: "media" },
      {
        key: "items",
        label: "Capabilities",
        kind: "repeater",
        itemFields: [
          { key: "title", label: "Title", kind: "text" },
          { key: "description", label: "Description", kind: "text" },
          { key: "imageUrl", label: "Image URL", kind: "media" },
          { key: "imageAlt", label: "Image alt text", kind: "text" },
        ],
      },
    ],
  },
  blitHorizontalGallery: {
    label: "Blit Horizontal Gallery",
    description: "Scrolling project gallery with title, subtitle, image, and link.",
    semanticTarget: "Project highlights, portfolio snapshots, or image-led case study teasers.",
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      {
        key: "projects",
        label: "Gallery projects",
        kind: "repeater",
        itemFields: [
          { key: "title", label: "Title", kind: "text" },
          { key: "subtitle", label: "Subtitle", kind: "text" },
          { key: "image", label: "Image URL", kind: "media" },
          { key: "href", label: "Link", kind: "link" },
        ],
      },
    ],
  },
  blitFinalStatement: {
    label: "Blit Final Statement",
    description: "Closing large-format statement near the end of the page.",
    semanticTarget: "Closing message, summary statement, or final brand line.",
    fields: [{ key: "title", label: "Title", kind: "text" }],
  },
};

type TemporaryPrefillArtifact = {
  id: string;
  runId: string;
  adminId: string;
  tenantId: string;
  siteId: string;
  pageKey: string;
  name: string;
  mimeType: string;
  kind: "text" | "document" | "image";
  sizeBytes: number;
  storageKey: string;
  dataUrl: string;
  extractedText: string | null;
  createdAt: Date;
  expiresAt: Date;
};

export type PrefillArtifactInput = {
  name: string;
  mimeType: string;
  dataUrl: string;
};

export type PagePrefillSuggestion = {
  runId?: string;
  analysis?: BriefContentAnalysis | null;
  page: {
    title?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
  };
  blocks: Array<{
    id?: string;
    blockId: string;
    blockType: string;
    label: string;
    summary: string;
    dataPatch: Record<string, unknown>;
    confidence: number;
    notes: string | null;
  }>;
};

export type BriefContentAnalysis = {
  brandName: string | null;
  positioning: string | null;
  audience: string[];
  services: string[];
  tone: string | null;
  notes: string[];
};

type PagePrefillSuggestionRaw = {
  analysis: BriefContentAnalysis;
  page: {
    title?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
  };
  blocks: Array<{
    blockId: string;
    blockType: string;
    label: string;
    summary: string;
    dataPatchJson: string;
    confidence: number;
    notes: string | null;
  }>;
};

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
}

function getOpenAiModel() {
  return process.env.OPENAI_MODEL || env.OPENAI_MODEL;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function safeFileName(value: string) {
  const ext = path.extname(value).slice(0, 16);
  const base = path
    .basename(value, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return `${base || "brief"}${ext || ""}`;
}

function summarizeExtractedText(value: string | null) {
  if (!value) {
    return null;
  }
  return normalizeInlineText(value).slice(0, 900);
}

async function writePrefillFile(options: {
  tenantId: string;
  siteId: string;
  runId: string;
  artifactId: string;
  fileName: string;
  mimeType: string;
  base64: string;
  sizeBytes: number;
}) {
  return putObject({
    visibility: "private",
    tenantId: options.tenantId,
    siteId: options.siteId,
    category: "ai-prefill",
    ownerId: options.runId,
    filename: `${options.artifactId}-${safeFileName(options.fileName)}`,
    body: Buffer.from(options.base64, "base64"),
    mimeType: options.mimeType,
    sizeBytes: options.sizeBytes,
  });
}

async function readPrefillFileAsDataUrl(storageKey: string, mimeType: string) {
  const bytes = await getObjectBytes(storageKey, "private");
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid file encoding.");
  }

  const base64 = match[2] ?? "";
  const sizeBytes = Buffer.byteLength(base64, "base64");
  return {
    mimeType: match[1] ?? "application/octet-stream",
    base64,
    sizeBytes,
  };
}

function readStreamToString(stream: Readable) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function xmlToReadableText(xml: string) {
  const withBreaks = xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n");

  const withoutTags = withBreaks.replace(/<[^>]+>/g, " ");
  return decodeXmlEntities(withoutTags).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

function extractDocxText(base64: string) {
  return new Promise<string | null>((resolve, reject) => {
    const buffer = Buffer.from(base64, "base64");
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (openError, zipfile) => {
      if (openError || !zipfile) {
        reject(openError ?? new Error("Could not open DOCX file."));
        return;
      }

      const xmlParts: string[] = [];

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        const isRelevantXml =
          entry.fileName === "word/document.xml" ||
          /^word\/header\d+\.xml$/.test(entry.fileName) ||
          /^word\/footer\d+\.xml$/.test(entry.fileName);

        if (!isRelevantXml) {
          zipfile.readEntry();
          return;
        }

        zipfile.openReadStream(entry, async (streamError, readStream) => {
          if (streamError || !readStream) {
            reject(streamError ?? new Error("Could not read DOCX content."));
            return;
          }

          try {
            xmlParts.push(await readStreamToString(readStream));
            zipfile.readEntry();
          } catch (error) {
            reject(error);
          }
        });
      });

      zipfile.on("end", () => {
        const text = xmlToReadableText(xmlParts.join("\n"));
        resolve(text ? redactSensitiveText(text).slice(0, 24_000) : null);
      });
      zipfile.on("error", reject);
    });
  });
}

function getArtifactKind(mimeType: string): TemporaryPrefillArtifact["kind"] {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    return "text";
  }
  return "document";
}

async function extractText(name: string, mimeType: string, base64: string) {
  if (mimeType !== "text/plain" && mimeType !== "text/markdown") {
    const lowerName = name.toLowerCase();
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lowerName.endsWith(".docx")
    ) {
      return extractDocxText(base64);
    }

    return null;
  }

  return redactSensitiveText(Buffer.from(base64, "base64").toString("utf8")).slice(0, 16_000);
}

export async function storeTemporaryPrefillArtifacts(options: {
  prisma: PrismaClient;
  adminId: string;
  tenantId: string;
  siteId: string;
  pageKey: string;
  pageId?: string | null;
  files: PrefillArtifactInput[];
}) {
  if (options.files.length < 1 || options.files.length > MAX_PREFILL_FILES) {
    return {
      type: "validation_error" as const,
      message: `Upload 1 to ${MAX_PREFILL_FILES} files.`,
    };
  }

  const preparedFiles = [];
  for (const file of options.files) {
    const parsed = parseDataUrl(file.dataUrl);
    const mimeType = file.mimeType || parsed.mimeType;
    if (!acceptedMimeTypes.has(mimeType)) {
      return {
        type: "validation_error" as const,
        message: "Upload PDF, DOCX, TXT, Markdown, PNG, JPG, or WebP files only.",
      };
    }
    if (parsed.sizeBytes > MAX_PREFILL_FILE_BYTES) {
      return {
        type: "validation_error" as const,
        message: `${file.name} is larger than 8 MB.`,
      };
    }

    preparedFiles.push({
      file,
      parsed,
      mimeType,
      kind: getArtifactKind(mimeType),
      extractedText: await extractText(file.name, mimeType, parsed.base64),
    });
  }

  const expiresAt = new Date(Date.now() + PREFILL_ARTIFACT_TTL_MS);
  const run = await options.prisma.aiPrefillRun.create({
    data: {
      adminId: options.adminId,
      tenantId: options.tenantId,
      siteId: options.siteId,
      pageId: options.pageId ?? null,
      pageKey: options.pageKey,
      status: "UPLOADED",
      expiresAt,
      metadata: toJsonInput({
        fileCount: preparedFiles.length,
        fileTypes: preparedFiles.map((entry) => entry.mimeType),
      }),
    },
  });

  const stored = [];

  for (const prepared of preparedFiles) {
    const artifactId = crypto.randomUUID();
    const storedObject = await writePrefillFile({
      tenantId: options.tenantId,
      siteId: options.siteId,
      runId: run.id,
      artifactId,
      fileName: prepared.file.name,
      mimeType: prepared.mimeType,
      base64: prepared.parsed.base64,
      sizeBytes: prepared.parsed.sizeBytes,
    });

    const artifact = await options.prisma.aiPrefillArtifact.create({
      data: {
        id: artifactId,
        runId: run.id,
        adminId: options.adminId,
        tenantId: options.tenantId,
        siteId: options.siteId,
        pageKey: options.pageKey,
        fileName: prepared.file.name,
        storageKey: storedObject.key,
        storageProvider: storedObject.provider,
        bucket: storedObject.bucket,
        visibility: "private",
        checksum: storedObject.checksum,
        mimeType: prepared.mimeType,
        kind: prepared.kind,
        sizeBytes: prepared.parsed.sizeBytes,
        extractedText: prepared.extractedText,
        extractedSummary: summarizeExtractedText(prepared.extractedText),
        status: "ACTIVE",
        expiresAt,
        retainedUntil: expiresAt,
      },
    });

    stored.push({
      id: artifact.id,
      runId: run.id,
      name: artifact.fileName,
      mimeType: artifact.mimeType,
      kind: artifact.kind as TemporaryPrefillArtifact["kind"],
      sizeBytes: artifact.sizeBytes,
      expiresAt: artifact.expiresAt.toISOString(),
      hasExtractedText: Boolean(artifact.extractedText),
    });
  }

  return { type: "success" as const, runId: run.id, artifacts: stored };
}

function buildFieldSchemaFromData(key: string, value: unknown): BlockFieldSchema {
  if (Array.isArray(value)) {
    const firstItem = value[0];
    if (firstItem && typeof firstItem === "object" && !Array.isArray(firstItem)) {
      return {
        key,
        label: key,
        kind: "repeater",
        itemFields: Object.keys(firstItem as Record<string, unknown>).map((itemKey) => ({
          key: itemKey,
          label: itemKey,
          kind: itemKey.toLowerCase().includes("image") ? "media" : itemKey.toLowerCase().includes("href") ? "link" : "text",
        })),
      };
    }

    return { key, label: key, kind: "list" };
  }

  if (key.toLowerCase().includes("image") || key.toLowerCase().includes("video")) {
    return { key, label: key, kind: "media" };
  }
  if (key.toLowerCase().includes("href") || key.toLowerCase().includes("url")) {
    return { key, label: key, kind: "link" };
  }

  return { key, label: key, kind: "text" };
}

function getBlockSchemaMetadata(type: string, data: Record<string, unknown>): BlockSchemaMetadata {
  const imported = importedBlockSchemaMetadata[type];
  if (imported) {
    return imported;
  }

  return {
    label: type,
    description: "Editable page section.",
    semanticTarget: "Best-fit website section based on the content themes in the uploaded brief.",
    fields: Object.entries(data).map(([key, value]) => buildFieldSchemaFromData(key, value)),
  };
}

function readStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readObjectArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)
      )
    : [];
}

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeStructuredText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitBriefLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => normalizeInlineText(line))
    .filter(Boolean);
}

function takeFirstSentence(value: string) {
  const normalized = normalizeInlineText(value);
  const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  return (match?.[1] ?? normalized).trim();
}

function clampCopy(value: string, maxLength: number) {
  const normalized = normalizeInlineText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxLength + 1);
  const safeBoundary = Math.max(sliced.lastIndexOf(". "), sliced.lastIndexOf(", "), sliced.lastIndexOf(" "));
  return sliced.slice(0, safeBoundary > 32 ? safeBoundary : maxLength).trim().replace(/[,:;]+$/, "");
}

function toSentenceCase(value: string) {
  const normalized = normalizeInlineText(value);
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function toTitleLike(value: string) {
  return normalizeInlineText(value)
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function canonicalizeHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/^\d+(?:\.\d+)*\s*/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseBriefSections(value: string) {
  const headingAliases = new Map<string, string>([
    ["positioning statement", "positioning"],
    ["about dsgnfi studio", "about"],
    ["about", "about"],
    ["what we do", "services"],
    ["services", "services"],
    ["digital marketing", "digital_marketing"],
    ["brand design", "brand_design"],
    ["web development", "web_development"],
    ["our approach", "approach"],
    ["who we work with", "audience"],
    ["why choose dsgnfi studio", "why_choose"],
    ["why choose us", "why_choose"],
    ["mission", "mission"],
    ["vision", "vision"],
    ["value promise", "value_promise"],
    ["core services", "services"],
  ]);

  const sections = new Map<string, string[]>();
  let currentKey: string | null = null;

  for (const line of splitBriefLines(value)) {
    const key = headingAliases.get(canonicalizeHeading(line));
    if (key) {
      currentKey = key;
      if (!sections.has(key)) {
        sections.set(key, []);
      }
      continue;
    }

    if (currentKey) {
      sections.get(currentKey)?.push(line);
    }
  }

  return new Map(
    Array.from(sections.entries()).map(([key, lines]) => [key, normalizeInlineText(lines.join(" "))])
  );
}

function getCombinedArtifactText(artifactsToCombine: TemporaryPrefillArtifact[]) {
  return normalizeStructuredText(
    artifactsToCombine
      .map((artifact) => artifact.extractedText ?? "")
      .filter(Boolean)
      .join("\n\n")
  );
}

function looksLikeRawDocumentChunk(value: string, sourceText: string) {
  const normalized = normalizeInlineText(value);
  if (normalized.length > 180) {
    return true;
  }

  const source = normalizeInlineText(sourceText);
  return normalized.length > 100 && source.includes(normalized);
}

function safeMetadataValue(value: unknown, sourceText: string, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeInlineText(value);
  if (!normalized || looksLikeRawDocumentChunk(normalized, sourceText)) {
    return null;
  }

  return clampCopy(normalized, maxLength);
}

function deriveBrandName(lines: string[]) {
  for (const line of lines.slice(0, 12)) {
    if (/company profile/i.test(line)) {
      const candidate = normalizeInlineText(line.replace(/company profile/gi, ""));
      if (candidate && candidate.length <= 80) {
        return candidate;
      }
    }
  }

  return lines.find((line) => /^[A-Z0-9 .&'-]{4,40}$/.test(line)) ?? "Studio";
}

function buildBriefAnalysisFromText(sourceText: string): BriefContentAnalysis {
  const lines = splitBriefLines(sourceText);
  const sections = parseBriefSections(sourceText);
  const brandName = deriveBrandName(lines);
  const positioning = clampCopy(sections.get("positioning") || takeFirstSentence(sourceText), 220) || null;
  const serviceCards = collectServiceCards(sections, sourceText);
  const audience = collectAudienceEntries(sections);
  const notes = [
    sections.get("about") ? "The brief includes a company overview suitable for editorial homepage copy." : "",
    serviceCards.length > 0 ? "Service lines can be mapped into capability and featured sections." : "",
    sections.get("approach") ? "The approach section can support process or closing copy." : "",
    sections.get("value_promise") || sections.get("mission") ? "Mission/value content can support the final statement." : "",
  ].filter(Boolean);

  return {
    brandName: brandName === "Studio" ? null : brandName,
    positioning,
    audience,
    services: serviceCards.map((card) => card.title),
    tone: "clear, professional, strategy-led, growth-focused",
    notes,
  };
}

function deriveHeroHeadline(positioning: string, brandName: string) {
  const source = normalizeInlineText(positioning || brandName);
  if (!source) {
    return "";
  }

  const trimmed = source
    .replace(/^we help\s+/i, "")
    .replace(/^(businesses|brands|organizations|founders)\s+/i, "")
    .replace(/^become\s+/i, "")
    .replace(/\bthrough\b[\s\S]*$/i, "")
    .replace(/[.]+$/, "")
    .trim();

  if (trimmed) {
    return clampCopy(trimmed.toLowerCase(), 92);
  }

  return clampCopy(source.toLowerCase(), 92);
}

function collectServiceCards(sections: Map<string, string>, fullText: string) {
  const cards: Array<{ title: string; description: string }> = [];
  const orderedSections = [
    ["Digital Marketing", "digital_marketing"],
    ["Brand Design", "brand_design"],
    ["Web Development", "web_development"],
  ] as const;

  for (const [title, key] of orderedSections) {
    const copy = sections.get(key);
    if (!copy) {
      continue;
    }
    cards.push({
      title,
      description: clampCopy(takeFirstSentence(copy), 160),
    });
  }

  if (cards.length > 0) {
    return cards;
  }

  const servicesCopy = sections.get("services") ?? "";
  const sentenceMatches = servicesCopy.match(/[^.?!]+[.?!]/g) ?? [];
  for (const sentence of sentenceMatches.slice(0, 3)) {
    const cleaned = clampCopy(sentence, 160);
    if (!cleaned) {
      continue;
    }
    cards.push({
      title: toTitleLike(cleaned.split(/\s+/).slice(0, 3).join(" ")),
      description: cleaned,
    });
  }

  if (cards.length > 0) {
    return cards;
  }

  const fallbackMatches = Array.from(
    fullText.matchAll(/\b(digital marketing|brand design|web development|creative strategy|campaign strategy)\b/gi)
  )
    .map((match) => toTitleLike(match[1] ?? ""))
    .filter(Boolean);

  return Array.from(new Set(fallbackMatches)).slice(0, 3).map((title) => ({
    title,
    description: "Refined from the uploaded brief.",
  }));
}

function collectAudienceEntries(sections: Map<string, string>) {
  const audienceCopy = sections.get("audience") ?? "";
  return audienceCopy
    .split(/[.;]|(?:\s+-\s+)/)
    .map((entry) => normalizeInlineText(entry))
    .filter((entry) => entry.length >= 4 && entry.length <= 72)
    .slice(0, 4);
}

function buildSeoTitle(analysis: BriefContentAnalysis, fallbackTitle: string) {
  const brand = analysis.brandName || fallbackTitle;
  const serviceText = analysis.services.slice(0, 3).join(", ");
  return clampCopy(serviceText ? `${brand} | ${serviceText}` : brand, 72);
}

function buildSeoDescription(analysis: BriefContentAnalysis) {
  return clampCopy(
    analysis.positioning ||
      [analysis.brandName, analysis.services.slice(0, 3).join(", ")].filter(Boolean).join(" helps with ") ||
      "",
    155
  );
}

function mergePrefillSuggestions(
  modelSuggestion: PagePrefillSuggestion,
  fallbackSuggestion: PagePrefillSuggestion
): PagePrefillSuggestion {
  const blockIds = new Set(modelSuggestion.blocks.map((block) => block.blockId));
  return {
    analysis: modelSuggestion.analysis ?? fallbackSuggestion.analysis ?? null,
    page: {
      title: modelSuggestion.page.title || fallbackSuggestion.page.title || null,
      seoTitle: modelSuggestion.page.seoTitle || fallbackSuggestion.page.seoTitle || null,
      seoDescription:
        modelSuggestion.page.seoDescription || fallbackSuggestion.page.seoDescription || null,
    },
    blocks: [
      ...modelSuggestion.blocks,
      ...fallbackSuggestion.blocks.filter((block) => !blockIds.has(block.blockId)),
    ],
  };
}

function buildDeterministicBlitHomepageFallback(options: {
  artifacts: TemporaryPrefillArtifact[];
  page: {
    title: string;
    blocks: Array<{ id: string; type: string; data: Record<string, unknown> }>;
  };
}): PagePrefillSuggestion {
  const fullText = getCombinedArtifactText(options.artifacts);
  if (!fullText) {
    return {
      analysis: null,
      page: { title: null, seoTitle: null, seoDescription: null },
      blocks: [],
    };
  }

  const lines = splitBriefLines(fullText);
  const sections = parseBriefSections(fullText);
  const analysis = buildBriefAnalysisFromText(fullText);
  const brandName = analysis.brandName || deriveBrandName(lines);
  const positioning = sections.get("positioning") || takeFirstSentence(fullText);
  const aboutCopy = sections.get("about") || sections.get("why_choose") || sections.get("approach") || "";
  const servicesCopy = sections.get("services") || sections.get("approach") || "";
  const valueCopy =
    sections.get("value_promise") || sections.get("mission") || sections.get("vision") || sections.get("why_choose") || "";
  const serviceCards = collectServiceCards(sections, fullText);
  const audienceEntries = collectAudienceEntries(sections);

  const blocks: PagePrefillSuggestion["blocks"] = [];
  for (const block of options.page.blocks) {
    if (block.type === "blitHeroCollage") {
      blocks.push({
        blockId: block.id,
        blockType: block.type,
        label: "Blit Hero Collage",
        summary: "Mapped the brand name and positioning statement into the hero copy.",
        confidence: 0.78,
        notes: "Generated from the uploaded brief without relying on document section order.",
        dataPatch: {
          ...(Object.prototype.hasOwnProperty.call(block.data, "eyebrow") ? { eyebrow: brandName } : {}),
          ...(Object.prototype.hasOwnProperty.call(block.data, "headline")
            ? { headline: deriveHeroHeadline(positioning, brandName) }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(block.data, "caption")
            ? { caption: clampCopy(positioning || aboutCopy, 180) }
            : {}),
        },
      });
      continue;
    }

    if (block.type === "blitFeaturedWork" && Object.prototype.hasOwnProperty.call(block.data, "projects")) {
      const existingProjects = readObjectArrayValue(block.data.projects);
      const nextProjects = existingProjects.map((project, index) => {
        const card = serviceCards[index];
        if (!card) {
          return project;
        }
        return {
          ...project,
          title: card.title,
          category: readStringValue(project.category) || "Service",
          description: card.description,
        };
      });

      blocks.push({
        blockId: block.id,
        blockType: block.type,
        label: "Blit Featured Work",
        summary: "Repurposed the featured cards with best-fit service themes from the brief.",
        confidence: 0.58,
        notes: "The uploaded brief described services more clearly than named case studies, so the media and links were preserved while the text was updated.",
        dataPatch: {
          ...(Object.prototype.hasOwnProperty.call(block.data, "heading") ? { heading: "what we do" } : {}),
          ...(Object.prototype.hasOwnProperty.call(block.data, "title") ? { title: "Core services" } : {}),
          projects: nextProjects,
        },
      });
      continue;
    }

    if (block.type === "blitEditorialStatement") {
      blocks.push({
        blockId: block.id,
        blockType: block.type,
        label: "Blit Editorial Statement",
        summary: "Used the company overview and approach copy for the editorial statement.",
        confidence: 0.74,
        notes: "This section was synthesized from the strongest overview paragraphs in the brief.",
        dataPatch: {
          ...(Object.prototype.hasOwnProperty.call(block.data, "eyebrow") ? { eyebrow: "Studio statement" } : {}),
          ...(Object.prototype.hasOwnProperty.call(block.data, "title")
            ? { title: clampCopy("Strategy-led creative work for brands that need clarity, visibility, and trust.", 110) }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(block.data, "body")
            ? { body: clampCopy(aboutCopy || servicesCopy || positioning, 320) }
            : {}),
        },
      });
      continue;
    }

    if (block.type === "blitCapabilitiesGrid" && Object.prototype.hasOwnProperty.call(block.data, "items")) {
      const existingItems = readObjectArrayValue(block.data.items);
      const nextItems = existingItems.map((item, index) => {
        const card = serviceCards[index];
        if (!card) {
          return item;
        }
        return {
          ...item,
          title: card.title,
          description: card.description,
        };
      });

      blocks.push({
        blockId: block.id,
        blockType: block.type,
        label: "Blit Capabilities Grid",
        summary: "Converted the unordered brief into capability cards while preserving the imported imagery.",
        confidence: 0.86,
        notes: "This is the most reliable section for generalized company-profile briefs.",
        dataPatch: {
          ...(Object.prototype.hasOwnProperty.call(block.data, "heading") ? { heading: "capabilities" } : {}),
          items: nextItems,
        },
      });
      continue;
    }

    if (block.type === "blitHorizontalGallery" && audienceEntries.length > 0 && Object.prototype.hasOwnProperty.call(block.data, "projects")) {
      const existingProjects = readObjectArrayValue(block.data.projects);
      const nextProjects = existingProjects.map((project, index) => {
        const audience = audienceEntries[index];
        if (!audience) {
          return project;
        }
        return {
          ...project,
          title: toTitleLike(audience),
          subtitle: "Audience fit from the uploaded brief",
        };
      });

      blocks.push({
        blockId: block.id,
        blockType: block.type,
        label: "Blit Horizontal Gallery",
        summary: "Used audience and client-fit cues from the brief for the gallery captions.",
        confidence: 0.51,
        notes: "Gallery media and links were preserved because the brief did not include new visual assets.",
        dataPatch: {
          ...(Object.prototype.hasOwnProperty.call(block.data, "heading") ? { heading: "who we work with" } : {}),
          projects: nextProjects,
        },
      });
      continue;
    }

    if (block.type === "blitFinalStatement") {
      blocks.push({
        blockId: block.id,
        blockType: block.type,
        label: "Blit Final Statement",
        summary: "Pulled a closing statement from the mission, value promise, and positioning copy.",
        confidence: 0.72,
        notes: "Built as a concise closing line for the homepage.",
        dataPatch: {
          ...(Object.prototype.hasOwnProperty.call(block.data, "title")
            ? { title: clampCopy(toSentenceCase(valueCopy || positioning), 96).toLowerCase() }
            : {}),
        },
      });
    }
  }

  return {
    analysis,
    page: {
      title: null,
      seoTitle: buildSeoTitle(analysis, options.page.title),
      seoDescription: buildSeoDescription(analysis) || clampCopy(positioning || aboutCopy, 155) || null,
    },
    blocks: blocks.filter((block) => Object.keys(block.dataPatch).length > 0),
  };
}

export async function cleanupExpiredPrefillArtifacts(prisma: PrismaClient) {
  const expired = await prisma.aiPrefillArtifact.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: new Date() },
    },
    select: { id: true, storageKey: true, visibility: true },
  });

  for (const artifact of expired) {
    await deleteObject(artifact.storageKey, artifact.visibility === "public" ? "public" : "private").catch(() => undefined);
  }

  if (expired.length > 0) {
    await prisma.aiPrefillArtifact.updateMany({
      where: { id: { in: expired.map((artifact) => artifact.id) } },
      data: { status: "EXPIRED", deletedAt: new Date() },
    });
  }

  await prisma.aiPrefillRun.updateMany({
    where: {
      status: { in: ["UPLOADED", "GENERATED"] },
      expiresAt: { lte: new Date() },
    },
    data: { status: "EXPIRED" },
  });
}

export async function getTemporaryPrefillArtifacts(options: {
  prisma: PrismaClient;
  adminId: string;
  tenantId: string;
  siteId: string;
  pageKey: string;
  artifactIds: string[];
}) {
  await cleanupExpiredPrefillArtifacts(options.prisma);

  const selected = await options.prisma.aiPrefillArtifact.findMany({
    where: {
      id: { in: options.artifactIds },
      adminId: options.adminId,
      tenantId: options.tenantId,
      siteId: options.siteId,
      pageKey: options.pageKey,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
    },
    include: { run: true },
  });

  return Promise.all(
    selected.map(async (artifact): Promise<TemporaryPrefillArtifact> => ({
      id: artifact.id,
      runId: artifact.runId,
      adminId: artifact.adminId,
      tenantId: artifact.tenantId,
      siteId: artifact.siteId,
      pageKey: artifact.pageKey,
      name: artifact.fileName,
      mimeType: artifact.mimeType,
      kind: artifact.kind as TemporaryPrefillArtifact["kind"],
      sizeBytes: artifact.sizeBytes,
      storageKey: artifact.storageKey,
      dataUrl: await readPrefillFileAsDataUrl(artifact.storageKey, artifact.mimeType),
      extractedText: artifact.extractedText,
      createdAt: artifact.createdAt,
      expiresAt: artifact.expiresAt,
    }))
  );
}

const prefillResponseSchema: ResponseFormatTextJSONSchemaConfig = {
  type: "json_schema",
  name: "admin_page_prefill_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["analysis", "page", "blocks"],
    properties: {
      analysis: {
        type: "object",
        additionalProperties: false,
        required: ["brandName", "positioning", "audience", "services", "tone", "notes"],
        properties: {
          brandName: { type: ["string", "null"], maxLength: 120 },
          positioning: { type: ["string", "null"], maxLength: 320 },
          audience: {
            type: "array",
            maxItems: 8,
            items: { type: "string", minLength: 1, maxLength: 120 },
          },
          services: {
            type: "array",
            maxItems: 8,
            items: { type: "string", minLength: 1, maxLength: 120 },
          },
          tone: { type: ["string", "null"], maxLength: 160 },
          notes: {
            type: "array",
            maxItems: 8,
            items: { type: "string", minLength: 1, maxLength: 180 },
          },
        },
      },
      page: {
        type: "object",
        additionalProperties: false,
        required: ["title", "seoTitle", "seoDescription"],
        properties: {
          title: { type: ["string", "null"], maxLength: 160 },
          seoTitle: { type: ["string", "null"], maxLength: 160 },
          seoDescription: { type: ["string", "null"], maxLength: 240 },
        },
      },
      blocks: {
        type: "array",
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["blockId", "blockType", "label", "summary", "dataPatchJson", "confidence", "notes"],
          properties: {
            blockId: { type: "string", minLength: 1, maxLength: 120 },
            blockType: { type: "string", minLength: 1, maxLength: 120 },
            label: { type: "string", minLength: 1, maxLength: 120 },
            summary: { type: "string", minLength: 1, maxLength: 260 },
            dataPatchJson: { type: "string", minLength: 2, maxLength: 12000 },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            notes: { type: ["string", "null"], maxLength: 240 },
          },
        },
      },
    },
  },
};

function artifactInputs(artifact: TemporaryPrefillArtifact): ResponseInputContent[] {
  if (artifact.kind === "image") {
    return [
      {
        type: "input_image",
        detail: "auto",
        image_url: artifact.dataUrl,
      } satisfies ResponseInputContent,
    ];
  }

  if (artifact.extractedText) {
    return [
      {
        type: "input_text",
        text: `Extracted brief text from ${artifact.name}:\n${artifact.extractedText}`,
      } satisfies ResponseInputContent,
    ];
  }

  return [
    {
      type: "input_file",
      file_data: artifact.dataUrl,
      filename: artifact.name,
    } satisfies ResponseInputContent,
  ];
}

function parseDataPatchJson(dataPatchJson: string) {
  try {
    const parsed = JSON.parse(dataPatchJson) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore invalid model output and fall back to an empty patch.
  }

  return {};
}

function sanitizeAnalysis(value: BriefContentAnalysis | undefined, fallback: BriefContentAnalysis | null): BriefContentAnalysis | null {
  const source = value ?? fallback;
  if (!source) {
    return null;
  }

  return {
    brandName: source.brandName ? clampCopy(source.brandName, 80) : null,
    positioning: source.positioning ? clampCopy(source.positioning, 260) : null,
    audience: Array.isArray(source.audience) ? source.audience.map((entry) => clampCopy(entry, 100)).filter(Boolean).slice(0, 8) : [],
    services: Array.isArray(source.services) ? source.services.map((entry) => clampCopy(entry, 100)).filter(Boolean).slice(0, 8) : [],
    tone: source.tone ? clampCopy(source.tone, 140) : null,
    notes: Array.isArray(source.notes) ? source.notes.map((entry) => clampCopy(entry, 160)).filter(Boolean).slice(0, 8) : [],
  };
}

function preserveRepeaterProtectedFields(
  existingValue: unknown,
  nextValue: unknown,
  protectedKeys: string[]
) {
  if (!Array.isArray(existingValue) || !Array.isArray(nextValue)) {
    return nextValue;
  }

  const existingItems = readObjectArrayValue(existingValue);
  const nextItems = readObjectArrayValue(nextValue);
  return nextItems.map((item, index) => {
    const existing = existingItems[index];
    if (!existing) {
      return item;
    }

    const preserved: Record<string, unknown> = { ...item };
    for (const key of protectedKeys) {
      if (!readStringValue(preserved[key]) && readStringValue(existing[key])) {
        preserved[key] = existing[key];
      }
    }
    return preserved;
  });
}

function sanitizePatchValue(key: string, value: unknown, existingValue: unknown, sourceText: string) {
  if (typeof value === "string") {
    const maxLength = key.toLowerCase().includes("description") || key.toLowerCase().includes("body") ? 520 : 180;
    return safeMetadataValue(value, sourceText, maxLength);
  }

  if (Array.isArray(value)) {
    const protectedKeys = ["image", "imageUrl", "videoUrl", "href", "hrefPageKey", "ctaHref"];
    return preserveRepeaterProtectedFields(existingValue, value, protectedKeys);
  }

  if (value && typeof value === "object") {
    return value;
  }

  return value ?? null;
}

function sanitizeBlockPatch(
  rawPatch: Record<string, unknown>,
  block: { data: Record<string, unknown> },
  sourceText: string
) {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawPatch)) {
    if (!Object.prototype.hasOwnProperty.call(block.data, key)) {
      continue;
    }

    const nextValue = sanitizePatchValue(key, value, block.data[key], sourceText);
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      continue;
    }
    sanitized[key] = nextValue;
  }

  return sanitized;
}

function normalizePrefillSuggestion(
  raw: PagePrefillSuggestionRaw,
  options: {
    page: {
      title: string;
      blocks: Array<{ id: string; type: string; data: Record<string, unknown> }>;
    };
    sourceText: string;
    fallbackAnalysis: BriefContentAnalysis | null;
  }
): PagePrefillSuggestion {
  const fallbackAnalysis = sanitizeAnalysis(raw.analysis, options.fallbackAnalysis);
  const blockLookup = new Map(options.page.blocks.map((block) => [block.id, block]));
  const blocks = raw.blocks
    .map((block) => {
      const targetBlock = blockLookup.get(block.blockId);
      if (!targetBlock || targetBlock.type !== block.blockType) {
        return null;
      }

      const dataPatch = sanitizeBlockPatch(parseDataPatchJson(block.dataPatchJson), targetBlock, options.sourceText);
      if (Object.keys(dataPatch).length === 0) {
        return null;
      }

      return {
        blockId: block.blockId,
        blockType: block.blockType,
        label: block.label,
        summary: clampCopy(block.summary, 240),
        dataPatch,
        confidence: block.confidence,
        notes: block.notes ? clampCopy(block.notes, 220) : null,
      };
    })
    .filter((block): block is PagePrefillSuggestion["blocks"][number] => Boolean(block));

  const seoTitle =
    safeMetadataValue(raw.page.seoTitle, options.sourceText, 72) ||
    (fallbackAnalysis ? buildSeoTitle(fallbackAnalysis, options.page.title) : null);
  const seoDescription =
    safeMetadataValue(raw.page.seoDescription, options.sourceText, 155) ||
    (fallbackAnalysis ? buildSeoDescription(fallbackAnalysis) : null);

  return {
    analysis: fallbackAnalysis,
    page: {
      title: safeMetadataValue(raw.page.title, options.sourceText, 80),
      seoTitle,
      seoDescription,
    },
    blocks,
  };
}

export async function createPagePrefillSuggestions(options: {
  adminId: string;
  artifacts: TemporaryPrefillArtifact[];
  page: {
    pageKey: string;
    title: string;
    slug: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    allowedBlockTypes: string[];
    blocks: Array<{ id: string; type: string; data: Record<string, unknown> }>;
  };
}) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new MissingOpenAIKeyError();
  }

  const client = new OpenAI({ apiKey });
  const sourceText = getCombinedArtifactText(options.artifacts);
  const deterministicFallback = buildDeterministicBlitHomepageFallback({
    artifacts: options.artifacts,
    page: {
      title: options.page.title,
      blocks: options.page.blocks,
    },
  });
  const currentPageSummary = {
    pageKey: options.page.pageKey,
    title: options.page.title,
    slug: options.page.slug,
    seoTitle: options.page.seoTitle ?? null,
    seoDescription: options.page.seoDescription ?? null,
    allowedBlockTypes: options.page.allowedBlockTypes,
    blocks: options.page.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      label: getBlockSchemaMetadata(block.type, block.data).label,
      description: getBlockSchemaMetadata(block.type, block.data).description,
      semanticTarget: getBlockSchemaMetadata(block.type, block.data).semanticTarget,
      editableKeys: Object.keys(block.data).slice(0, 24),
      fields: getBlockSchemaMetadata(block.type, block.data).fields,
    })),
  };

  const response = await client.responses.create({
    model: getOpenAiModel(),
    store: false,
    safety_identifier: crypto.createHash("sha256").update(options.adminId).digest("hex").slice(0, 64),
    max_output_tokens: 3400,
    instructions: [
      "You suggest draft-only CMS page updates from uploaded website briefs.",
      "Return structured suggestions only. Do not publish, save, or claim that changes were applied.",
      "First interpret the brief as a business/content strategy. Put that concise interpretation in analysis.",
      "Then generate page-ready copy for every relevant target block, especially homepage hero, featured/service cards, editorial statement, capabilities, audience/gallery, and final statement blocks.",
      "Only suggest patch keys that already exist in the target block editableKeys.",
      "Return each block patch in dataPatchJson as a valid JSON object string.",
      "Do not put raw extracted document text in title, seoTitle, seoDescription, or any block field.",
      "Do not copy the whole brief. Rewrite it into concise website copy tailored to each block.",
      "Preserve existing image, video, href, hrefPageKey, ctaHref, and media fields unless the brief explicitly supplies replacement URLs.",
      "The uploaded brief may be unordered, general, or written as a company profile rather than page sections.",
      "Map content by semantic fit, not by the order it appears in the document or the order of blocks on the page.",
      "Use the block label, description, semanticTarget, and field labels to decide where content belongs.",
      "Prefer a partial best-fit suggestion for the most relevant sections instead of returning no suggestions when the brief contains usable homepage content.",
      "Prefer concise, page-ready copy. Avoid secrets or personal contact details unless clearly intended as public website content.",
    ].join("\n"),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Current page metadata and block schema:\n${JSON.stringify(currentPageSummary)}`,
          },
          ...options.artifacts.flatMap(artifactInputs),
        ],
      } satisfies EasyInputMessage,
    ],
    text: { format: prefillResponseSchema },
  });

  try {
    const parsed = JSON.parse(response.output_text ?? "") as PagePrefillSuggestionRaw;
    const normalized = normalizePrefillSuggestion(parsed, {
      page: {
        title: options.page.title,
        blocks: options.page.blocks,
      },
      sourceText,
      fallbackAnalysis: deterministicFallback.analysis ?? null,
    });
    return normalized.blocks.length > 0 ? mergePrefillSuggestions(normalized, deterministicFallback) : deterministicFallback;
  } catch {
    return deterministicFallback;
  }
}

export async function persistPagePrefillSuggestions(options: {
  prisma: PrismaClient;
  runId: string;
  pageId?: string | null;
  suggestions: PagePrefillSuggestion;
}) {
  const now = new Date();
  await options.prisma.aiPrefillSuggestion.deleteMany({
    where: { runId: options.runId },
  });

  const persistedBlocks = [];
  for (const block of options.suggestions.blocks) {
    const persisted = await options.prisma.aiPrefillSuggestion.create({
      data: {
        runId: options.runId,
        pageId: options.pageId ?? null,
        blockId: block.blockId,
        blockType: block.blockType,
        label: block.label,
        summary: block.summary,
        dataPatch: toJsonInput(block.dataPatch),
        confidence: block.confidence,
        notes: block.notes,
        status: "PENDING",
      },
    });
    persistedBlocks.push({ ...block, id: persisted.id });
  }

  await options.prisma.aiPrefillRun.update({
    where: { id: options.runId },
    data: {
      status: "GENERATED",
      model: getOpenAiModel(),
      analysis: options.suggestions.analysis ? toJsonInput(options.suggestions.analysis) : undefined,
      pageSuggestion: toJsonInput(options.suggestions.page),
      generatedAt: now,
      metadata: toJsonInput({
        suggestedBlockCount: persistedBlocks.length,
        suggestedMetadata: Boolean(
          options.suggestions.page.title ||
            options.suggestions.page.seoTitle ||
            options.suggestions.page.seoDescription
        ),
      }),
    },
  });

  return {
    ...options.suggestions,
    runId: options.runId,
    blocks: persistedBlocks,
  };
}

export async function recordPrefillApplication(options: {
  prisma: PrismaClient;
  adminId: string;
  siteId: string;
  pageId?: string | null;
  pageKey: string;
  runId: string;
  selectedMetadata: string[];
  selectedSuggestionIds: string[];
  appliedPatch: Record<string, unknown>;
}) {
  const run = await options.prisma.aiPrefillRun.findFirst({
    where: {
      id: options.runId,
      adminId: options.adminId,
      siteId: options.siteId,
      pageKey: options.pageKey,
    },
    select: { id: true },
  });
  if (!run) {
    return { type: "not_found" as const };
  }

  await options.prisma.$transaction(async (tx) => {
    await tx.aiSuggestionApplication.create({
      data: {
        runId: options.runId,
        adminId: options.adminId,
        siteId: options.siteId,
        pageId: options.pageId ?? null,
        pageKey: options.pageKey,
        action: "APPLIED",
        selectedMetadata: toJsonInput(options.selectedMetadata),
        selectedSuggestionIds: toJsonInput(options.selectedSuggestionIds),
        appliedPatch: toJsonInput(options.appliedPatch),
      },
    });

    if (options.selectedSuggestionIds.length > 0) {
      await tx.aiPrefillSuggestion.updateMany({
        where: {
          runId: options.runId,
          id: { in: options.selectedSuggestionIds },
        },
        data: {
          status: "APPLIED",
          appliedAt: new Date(),
        },
      });
    }

    await tx.aiPrefillRun.update({
      where: { id: options.runId },
      data: {
        status: "APPLIED",
        appliedAt: new Date(),
      },
    });
  });

  return { type: "success" as const };
}

export async function recordPrefillRejection(options: {
  prisma: PrismaClient;
  adminId: string;
  siteId: string;
  pageId?: string | null;
  pageKey: string;
  runId: string;
}) {
  const run = await options.prisma.aiPrefillRun.findFirst({
    where: {
      id: options.runId,
      adminId: options.adminId,
      siteId: options.siteId,
      pageKey: options.pageKey,
    },
    select: { id: true },
  });
  if (!run) {
    return { type: "not_found" as const };
  }

  await options.prisma.$transaction(async (tx) => {
    await tx.aiSuggestionApplication.create({
      data: {
        runId: options.runId,
        adminId: options.adminId,
        siteId: options.siteId,
        pageId: options.pageId ?? null,
        pageKey: options.pageKey,
        action: "REJECTED",
      },
    });

    await tx.aiPrefillSuggestion.updateMany({
      where: { runId: options.runId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
      },
    });

    await tx.aiPrefillRun.update({
      where: { id: options.runId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
      },
    });
  });

  return { type: "success" as const };
}
