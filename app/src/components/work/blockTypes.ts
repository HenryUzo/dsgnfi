export type ProjectBlockType =
  | "hero"
  | "richText"
  | "image"
  | "gallery"
  | "metrics"
  | "quote"
  | "timeline"
  | "video"
  | "cta"
  | "processHeroAtticSalt"
  | "processMethodIntro"
  | "processStepsAccordion"
  | "processMediaPeekCarousel"
  | "processCtaOutline";

export type ProjectBlock = {
  id: string;
  type: ProjectBlockType;
  variant?: string;
  data: Record<string, unknown>;
};

export type ProjectContent = {
  blocks: ProjectBlock[];
};

export function createBlock(
  id: string,
  type: ProjectBlockType,
  data: Record<string, unknown>,
  variant?: string
): ProjectBlock {
  return { id, type, variant, data };
}

export function cloneProjectContent<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeProjectContent(value: unknown): ProjectContent {
  if (!value || typeof value !== "object") {
    return { blocks: [] };
  }

  const maybeBlocks = (value as { blocks?: unknown }).blocks;
  if (!Array.isArray(maybeBlocks)) {
    return { blocks: [] };
  }

  const blocks: ProjectBlock[] = [];

  maybeBlocks.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const raw = item as {
        id?: unknown;
        type?: unknown;
        variant?: unknown;
        data?: unknown;
      };
      if (typeof raw.id !== "string") return;
      if (typeof raw.type !== "string") return;
      if (!raw.data || typeof raw.data !== "object") return;
      const block: ProjectBlock = {
        id: raw.id,
        type: raw.type as ProjectBlockType,
        variant: typeof raw.variant === "string" ? raw.variant : undefined,
        data: raw.data as Record<string, unknown>,
      };
      blocks.push(block);
    });

  return { blocks };
}
