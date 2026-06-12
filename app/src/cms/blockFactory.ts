import { createBlock, type ProjectBlock, type ProjectBlockType } from "../components/work/blockTypes";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultBlock(type: ProjectBlockType): ProjectBlock {
  const id = createId();

  switch (type) {
    case "hero":
      return createBlock(
        id,
        "hero",
        {
          eyebrow: "Case Study",
          headline: "New hero headline",
          subheadline: "Add a short subheadline to set context.",
          backgroundImage: "",
        },
        "classic"
      );
    case "richText":
      return createBlock(
        id,
        "richText",
        {
          title: "Section title",
          body: "Write the section narrative here.",
        },
        "prose"
      );
    case "image":
      return createBlock(id, "image", {
        url: "",
        caption: "",
      });
    case "gallery":
      return createBlock(id, "gallery", {
        images: ["", "", ""],
        caption: "",
      });
    case "metrics":
      return createBlock(id, "metrics", {
        title: "Outcomes",
        items: [
          { label: "Metric", value: "0" },
          { label: "Metric", value: "0" },
        ],
      });
    case "quote":
      return createBlock(id, "quote", {
        quote: "A concise client quote goes here.",
        author: "Client Name",
        role: "Role",
      });
    case "timeline":
      return createBlock(id, "timeline", {
        title: "Timeline",
        items: [
          { year: "Phase 1", title: "Discovery", description: "Research and inputs." },
          { year: "Phase 2", title: "Execution", description: "Design and delivery." },
        ],
      });
    case "video":
      return createBlock(id, "video", {
        url: "",
        title: "Video",
        caption: "",
      });
    case "cta":
      return createBlock(id, "cta", {
        title: "Ready to take the next step?",
        description: "Use this CTA to guide visitors to contact or explore more work.",
        primaryLabel: "Contact",
        primaryHref: "/contact",
        secondaryLabel: "View Work",
        secondaryHref: "/work",
      });
    case "processHeroAtticSalt":
      return createBlock(id, "processHeroAtticSalt", {
        title: "Don't be the side show,\nwhen you can be the star.",
        collageImageUrl: "",
        collageAlt: "Process collage",
      });
    case "processMethodIntro":
      return createBlock(id, "processMethodIntro", {
        kicker: "OUR APPROACH TO BRAND BUILDING",
        paragraphs: [
          "Method Branding is an extremely mindful approach that empowers our teams with the stage to deliver a brand performance that captivates your audiences and makes them demand an encore.",
          "Inspired by method acting, our iACT process ensures we embody the brand before we express it.",
          "It's strategic, psychological, and rigorously human-centered. The result is a brand identity that feels real, not rehearsed.",
        ],
      });
    case "processStepsAccordion":
      return createBlock(id, "processStepsAccordion", {
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
              "From product to brand launch, we'll be your side by side collaborators to bring visibility, clarity, and momentum.",
            deliverables: ["Launch plan", "Activation assets"],
          },
        ],
      });
    case "processMediaPeekCarousel":
      return createBlock(id, "processMediaPeekCarousel", {
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
            title: "Next",
            mainImageUrl: "",
            peekImageUrl: "",
          },
        ],
        showCounter: true,
      });
    case "processCtaOutline":
      return createBlock(id, "processCtaOutline", {
        title: "Ready to start a project?",
        linkLabel: "LET'S CHAT",
        href: "/contact",
      });
    default:
      return createBlock(id, type, {});
  }
}

