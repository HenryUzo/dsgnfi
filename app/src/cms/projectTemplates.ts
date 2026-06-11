import {
  cloneProjectContent,
  createBlock,
  type ProjectContent,
} from "../components/work/blockTypes";

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  previewLabel: string;
  defaultContent: ProjectContent;
};

const templates: ProjectTemplate[] = [
  {
    id: "classic-case-study",
    name: "Classic Case Study",
    description: "Balanced storytelling with hero, narrative, visuals, and outcomes.",
    previewLabel: "Classic",
    defaultContent: {
      blocks: [
        createBlock(
          "hero",
          "hero",
          {
            eyebrow: "Case Study",
            headline: "Classic structure for strategic storytelling",
            subheadline: "Start with context, then build through challenge and outcomes.",
            backgroundImage: "",
          },
          "classic"
        ),
        createBlock(
          "overview",
          "richText",
          {
            title: "Overview",
            body: "Summarize the client, category, and strategic objective.",
          },
          "prose"
        ),
        createBlock("feature-image", "image", { url: "", caption: "Signature project visual." }),
        createBlock(
          "challenge",
          "richText",
          {
            title: "Challenge",
            body: "Describe the constraints, market pressure, and why change was needed.",
          },
          "prose"
        ),
        createBlock("results", "metrics", {
          title: "Outcomes",
          items: [
            { label: "Conversion Lift", value: "+42%" },
            { label: "Lead Volume", value: "+28%" },
            { label: "Engagement", value: "+3.1x" },
          ],
        }),
      ],
    },
  },
  {
    id: "split-hero-sticky-story",
    name: "Split Hero + Sticky Story",
    description: "Strong split hero with editorial narrative that pins while scrolling.",
    previewLabel: "Split",
    defaultContent: {
      blocks: [
        createBlock(
          "hero",
          "hero",
          {
            eyebrow: "Transformation",
            headline: "Split hero for visual-first storytelling",
            subheadline: "Pair strong visual context with concise strategic framing.",
            backgroundImage: "",
          },
          "split"
        ),
        createBlock(
          "story",
          "richText",
          {
            title: "The Story",
            body: "Use this block for long-form narrative while visuals reinforce each chapter.",
          },
          "sticky"
        ),
        createBlock("gallery", "gallery", {
          images: ["", "", ""],
          caption: "Key moments in sequence.",
        }),
      ],
    },
  },
  {
    id: "editorial-story",
    name: "Editorial Story",
    description: "Magazine-inspired narrative with pull quotes and immersive pacing.",
    previewLabel: "Editorial",
    defaultContent: {
      blocks: [
        createBlock(
          "hero",
          "hero",
          {
            eyebrow: "Editorial",
            headline: "Narrative-first case study flow",
            subheadline: "Designed for depth, pacing, and brand voice.",
            backgroundImage: "",
          },
          "editorial"
        ),
        createBlock("intro", "richText", {
          title: "Introduction",
          body: "Set the premise and establish tension early.",
        }),
        createBlock("quote", "quote", {
          quote: "The strategy gave us clarity and the creative gave us momentum.",
          author: "Client Name",
          role: "CMO",
        }),
        createBlock("full-image", "image", {
          url: "",
          caption: "A full-width visual break for rhythm.",
        }),
        createBlock("chapter-two", "richText", {
          title: "Execution",
          body: "Break down how strategic decisions became tangible deliverables.",
        }),
      ],
    },
  },
  {
    id: "gallery-grid",
    name: "Gallery Grid",
    description: "Visual-heavy showcase for identity systems and campaign assets.",
    previewLabel: "Grid",
    defaultContent: {
      blocks: [
        createBlock(
          "hero",
          "hero",
          {
            eyebrow: "Visual Showcase",
            headline: "Gallery-driven project narrative",
            subheadline: "Lead with image systems and design craftsmanship.",
            backgroundImage: "",
          },
          "minimal"
        ),
        createBlock("gallery-main", "gallery", {
          images: ["", "", "", "", "", ""],
          caption: "Core assets from across the project system.",
        }),
        createBlock("support-copy", "richText", {
          title: "Design Rationale",
          body: "Explain the strategic thinking behind visual decisions.",
        }),
      ],
    },
  },
  {
    id: "timeline-journey",
    name: "Timeline Journey",
    description: "Chronological build-up from discovery through launch and impact.",
    previewLabel: "Timeline",
    defaultContent: {
      blocks: [
        createBlock(
          "hero",
          "hero",
          {
            eyebrow: "Journey",
            headline: "Map the project from kickoff to impact",
            subheadline: "Great for transformation and phased execution.",
            backgroundImage: "",
          },
          "timeline"
        ),
        createBlock("timeline", "timeline", {
          title: "Project Timeline",
          items: [
            { year: "Week 1-2", title: "Discovery", description: "Research and stakeholder interviews." },
            { year: "Week 3-4", title: "Strategy", description: "Positioning and messaging system." },
            { year: "Week 5-8", title: "Design", description: "Identity, digital and rollout assets." },
            { year: "Week 9+", title: "Launch", description: "Activation and optimization." },
          ],
        }),
        createBlock("impact", "metrics", {
          title: "Impact",
          items: [
            { label: "Pipeline Growth", value: "+36%" },
            { label: "Brand Recall", value: "+22%" },
          ],
        }),
      ],
    },
  },
  {
    id: "video-prototype-first",
    name: "Video/Prototype First",
    description: "Lead with demo/prototype video and support with concise narrative.",
    previewLabel: "Video",
    defaultContent: {
      blocks: [
        createBlock("video", "video", {
          url: "",
          title: "Prototype Walkthrough",
          caption: "Embed a playable prototype or case-study walkthrough.",
        }),
        createBlock(
          "hero",
          "hero",
          {
            eyebrow: "Product Experience",
            headline: "Show the product in motion first",
            subheadline: "Then explain strategic and UX choices.",
            backgroundImage: "",
          },
          "video-first"
        ),
        createBlock("context", "richText", {
          title: "Context",
          body: "Explain audience needs, product goals, and technical constraints.",
        }),
      ],
    },
  },
  {
    id: "metrics-outcomes",
    name: "Metrics + Outcomes",
    description: "Outcome-driven layout focused on numbers, proof, and business value.",
    previewLabel: "Metrics",
    defaultContent: {
      blocks: [
        createBlock(
          "hero",
          "hero",
          {
            eyebrow: "Results",
            headline: "Business outcomes at the center",
            subheadline: "This layout prioritizes measurable impact.",
            backgroundImage: "",
          },
          "outcomes"
        ),
        createBlock("metrics", "metrics", {
          title: "KPI Highlights",
          items: [
            { label: "Revenue Growth", value: "+18%" },
            { label: "CAC Reduction", value: "-21%" },
            { label: "Qualified Leads", value: "+49%" },
            { label: "Sales Cycle", value: "-17%" },
          ],
        }),
        createBlock("quote", "quote", {
          quote: "The work gave us both speed and confidence in-market.",
          author: "Operations Lead",
          role: "Enterprise Client",
        }),
        createBlock("cta", "cta", {
          title: "See how this approach can work for your team",
          description: "Use this CTA to drive exploration or contact.",
          primaryLabel: "Start a Project",
          primaryHref: "/contact",
          secondaryLabel: "Explore Work",
          secondaryHref: "/work",
        }),
      ],
    },
  },
  {
    id: "modular-enterprise",
    name: "Modular/Enterprise",
    description: "Flexible multi-section structure for large, complex engagements.",
    previewLabel: "Modular",
    defaultContent: {
      blocks: [
        createBlock(
          "hero",
          "hero",
          {
            eyebrow: "Enterprise Program",
            headline: "Modular layout for complex, cross-functional work",
            subheadline: "Combine multiple block types for layered narratives.",
            backgroundImage: "",
          },
          "enterprise"
        ),
        createBlock("overview", "richText", {
          title: "Program Overview",
          body: "Outline scope, stakeholders, regions, and governance model.",
        }),
        createBlock("gallery", "gallery", {
          images: ["", "", "", ""],
          caption: "Artifacts across teams and channels.",
        }),
        createBlock("timeline", "timeline", {
          title: "Delivery Workstreams",
          items: [
            { year: "Q1", title: "Foundation", description: "Research and north-star definition." },
            { year: "Q2", title: "Pilot", description: "Launch in core segments." },
            { year: "Q3", title: "Scale", description: "Expand to global teams and channels." },
          ],
        }),
        createBlock("cta", "cta", {
          title: "Need a scalable operating model?",
          description: "Use this section to route enterprise leads.",
          primaryLabel: "Talk to Us",
          primaryHref: "/contact",
          secondaryLabel: "Back to Work",
          secondaryHref: "/work",
        }),
      ],
    },
  },
];

export const projectTemplates = templates;

export function getTemplateById(id: string) {
  return projectTemplates.find((template) => template.id === id) ?? null;
}

export function getTemplateContent(id: string): ProjectContent | null {
  const template = getTemplateById(id);
  if (!template) {
    return null;
  }
  return cloneProjectContent(template.defaultContent);
}
