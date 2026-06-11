import {
  Film,
  GalleryHorizontal,
  Image as ImageIcon,
  LayoutTemplate,
  Layers,
  ListCollapse,
  PanelsTopLeft,
  Quote,
  Ruler,
  Text,
  TrendingUp,
  Waypoints,
} from "lucide-react";

import type { ProjectBlock, ProjectBlockType } from "../components/work/blockTypes";
import { createDefaultBlock } from "./blockFactory";

export type BlockRegistryItem = {
  type: ProjectBlockType;
  label: string;
  description: string;
  icon: typeof LayoutTemplate;
  create: () => ProjectBlock;
};

export const blockRegistry: BlockRegistryItem[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Project headline + supporting copy.",
    icon: LayoutTemplate,
    create: () => createDefaultBlock("hero"),
  },
  {
    type: "richText",
    label: "Text",
    description: "Heading + paragraph narrative.",
    icon: Text,
    create: () => createDefaultBlock("richText"),
  },
  {
    type: "image",
    label: "Image",
    description: "Single image with caption.",
    icon: ImageIcon,
    create: () => createDefaultBlock("image"),
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "Image grid layout.",
    icon: GalleryHorizontal,
    create: () => createDefaultBlock("gallery"),
  },
  {
    type: "metrics",
    label: "Metrics",
    description: "Highlight KPIs or outcomes.",
    icon: TrendingUp,
    create: () => createDefaultBlock("metrics"),
  },
  {
    type: "quote",
    label: "Quote",
    description: "Client quote + attribution.",
    icon: Quote,
    create: () => createDefaultBlock("quote"),
  },
  {
    type: "timeline",
    label: "Timeline",
    description: "Phased journey or roadmap.",
    icon: Waypoints,
    create: () => createDefaultBlock("timeline"),
  },
  {
    type: "video",
    label: "Video",
    description: "Embedded video player.",
    icon: Film,
    create: () => createDefaultBlock("video"),
  },
  {
    type: "cta",
    label: "CTA",
    description: "Call-to-action section.",
    icon: Ruler,
    create: () => createDefaultBlock("cta"),
  },
  {
    type: "processHeroAtticSalt",
    label: "Process Hero",
    description: "Attic Salt hero with collage.",
    icon: PanelsTopLeft,
    create: () => createDefaultBlock("processHeroAtticSalt"),
  },
  {
    type: "processMethodIntro",
    label: "Process Intro",
    description: "Method branding intro copy.",
    icon: Text,
    create: () => createDefaultBlock("processMethodIntro"),
  },
  {
    type: "processStepsAccordion",
    label: "Process Steps",
    description: "Steps grid with deliverables accordion.",
    icon: ListCollapse,
    create: () => createDefaultBlock("processStepsAccordion"),
  },
  {
    type: "processMediaPeekCarousel",
    label: "Process Media",
    description: "Main + peek media layout.",
    icon: GalleryHorizontal,
    create: () => createDefaultBlock("processMediaPeekCarousel"),
  },
  {
    type: "processCtaOutline",
    label: "Process CTA",
    description: "Outlined CTA card.",
    icon: Layers,
    create: () => createDefaultBlock("processCtaOutline"),
  },
];

export function getBlockRegistryItem(type: ProjectBlockType) {
  return blockRegistry.find((item) => item.type === type) ?? null;
}
