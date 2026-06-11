import {
  cloneProjectContent,
  createBlock,
  type ProjectContent,
} from "../components/work/blockTypes";

export type ProcessTemplate = {
  id: string;
  name: string;
  description: string;
  defaultContent: ProjectContent;
};

const templates: ProcessTemplate[] = [
  {
    id: "attic-salt",
    name: "Attic Salt",
    description: "Exact screenshot layout: hero, method intro, steps, media peek, CTA.",
    defaultContent: {
      blocks: [
        createBlock("process-hero-attic", "processHeroAtticSalt", {
          title: "Don't be the side show,\nwhen you can be the star.",
          collageImageUrl: "",
          collageAlt: "Process collage",
        }),
        createBlock("process-method-intro", "processMethodIntro", {
          kicker: "OUR APPROACH TO BRAND BUILDING",
          paragraphs: [
            "Method Branding\u2122 is an extremely mindful approach that empowers our teams with the stage to deliver a brand performance that captivates your audiences and makes them demand an encore.",
            "Inspired by method acting, our iACT process ensures we embody the brand before we express it.",
            "It's strategic, psychological, and rigorously human-centered. The result is a brand identity that feels real, not rehearsed.",
          ],
        }),
        createBlock("process-steps", "processStepsAccordion", {
          heading: "The method to our mastery",
          steps: [
            {
              number: "01",
              title: "Immerse",
              description:
                "An unfiltered dive into the user and your organization to unlock key insights and define what truly makes your brand one-of-a-kind.",
              deliverables: ["Research synthesis", "Insight report"],
            },
            {
              number: "02",
              title: "Articulate",
              description:
                "Learning how your brand connects, clarifying your unique position and surfacing a clear messaging system aligned to your story.",
              deliverables: ["Messaging", "Positioning"],
            },
            {
              number: "03",
              title: "Create",
              description:
                "We then translate your powerful story into visually compelling work designed to communicate your brand with clarity and impact.",
              deliverables: ["Identity system", "Core assets"],
            },
            {
              number: "04",
              title: "Transform",
              description:
                "From product to brand launch, we\u2019ll be your side by side collaborators to bring visibility, clarity, and momentum.",
              deliverables: ["Launch plan", "Activation assets"],
            },
          ],
        }),
        createBlock("process-media", "processMediaPeekCarousel", {
          heading: "Introducing Brand Seasoning\u00ae",
          description:
            "We invented Brand Seasoning to amplify the brands behind everyday experiences. From workbooks, ecosystems, and digital frameworks to memorable touchpoints designed to keep your craft fresh and recognizable.",
          slides: [
            {
              title: "Brand Framework",
              mainImageUrl: "",
              peekImageUrl: "",
            },
            {
              title: "Next Slide",
              mainImageUrl: "",
              peekImageUrl: "",
            },
          ],
          showCounter: true,
        }),
        createBlock("process-cta", "processCtaOutline", {
          title: "Ready to start\na project?",
          linkLabel: "LET'S CHAT",
          href: "/contact",
        }),
      ],
    },
  },
  {
    id: "method-branding",
    name: "Method Branding (Classic)",
    description: "Hero + editorial overview + method timeline + collage + CTA.",
    defaultContent: {
      blocks: [
        createBlock(
          "process-hero",
          "hero",
          {
            eyebrow: "Process",
            headline: "Don't be the side show, when you can be the star.",
            subheadline: "",
            backgroundImage: "",
          },
          "process"
        ),
        createBlock(
          "process-overview",
          "richText",
          {
            eyebrow: "OUR APPROACH TO BRAND BUILDING",
            title: "Method Branding",
            body:
              "Method Branding is an extremely mindful approach that empowers our teams with the stage to deliver a brand performance that captivates your audiences and makes them demand an encore.\n\nInspired by method acting, our iACT process ensures we embody the brand before we express it.\n\nIt's strategic, psychological, and rigorously human-centered. The result is a brand identity that feels real, not rehearsed.",
          },
          "process"
        ),
        createBlock(
          "process-timeline",
          "timeline",
          {
            title: "The method to our mastery",
            items: [
              {
                year: "01",
                title: "Immerse",
                description:
                  "An unfiltered dive into the user and your organization to unlock key insights and define what truly makes your brand one-of-a-kind.",
              },
              {
                year: "02",
                title: "Articulate",
                description:
                  "Learning how your brand connects, clarifying your unique position and surfacing a clear messaging system aligned to your story.",
              },
              {
                year: "03",
                title: "Create",
                description:
                  "We then translate your powerful story into visually compelling work designed to communicate your brand with clarity and impact.",
              },
              {
                year: "04",
                title: "Transform",
                description:
                  "From product to brand launch, we\u2019ll be your side by side collaborators to bring visibility, clarity, and momentum.",
              },
            ],
          },
          "process"
        ),
        createBlock(
          "process-intro",
          "richText",
          {
            eyebrow: "",
            title: "Introducing Brand Seasoning\u00ae",
            body:
              "We invented Brand Seasoning to amplify the brands behind everyday experiences. From workbooks, ecosystems, and digital frameworks to memorable touchpoints designed to keep your craft fresh and recognizable.",
          },
          "process"
        ),
        createBlock(
          "process-gallery",
          "gallery",
          {
            images: ["", "", ""],
            caption: "Brand Framework",
          },
          "process"
        ),
        createBlock(
          "process-cta",
          "cta",
          {
            title: "Ready to start a project?",
            description: "",
            primaryLabel: "Let's Chat",
            primaryHref: "/contact",
          },
          "process"
        ),
      ],
    },
  },
];

export const processTemplates = templates;

export function getProcessTemplateById(id: string) {
  return processTemplates.find((template) => template.id === id) ?? null;
}

export function getProcessTemplateContent(id: string): ProjectContent | null {
  const template = getProcessTemplateById(id);
  if (!template) return null;
  return cloneProjectContent(template.defaultContent);
}

export const defaultProcessTemplate = cloneProjectContent(
  processTemplates[0].defaultContent
);
