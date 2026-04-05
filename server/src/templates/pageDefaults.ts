import type { SupportedPageDefinition } from "./types";

function heroBlock(headline: string, subheadline: string) {
  return {
    id: "hero-1",
    type: "hero" as const,
    data: {
      headline,
      subheadline,
      primaryCtaLabel: "Get Started",
      primaryCtaHref: "/contact",
    },
  };
}

function richTextBlock(title: string, body: string) {
  return {
    id: "richtext-1",
    type: "richText" as const,
    data: {
      title,
      body,
    },
  };
}

function ctaBlock(title: string, label = "Contact Us", href = "/contact") {
  return {
    id: "cta-1",
    type: "cta" as const,
    data: {
      title,
      label,
      href,
    },
  };
}

export function buildStarterSupportedPages(options: {
  processEnabled: boolean;
  workEnabled: boolean;
}): SupportedPageDefinition[] {
  const pages: SupportedPageDefinition[] = [
    {
      pageKey: "home",
      title: "Home",
      slug: "/",
      isRequired: true,
      allowedBlockTypes: ["hero", "features", "stats", "faq", "cta", "gallery"],
      defaultBlocks: [
        heroBlock("Welcome to your new site", "Update this headline in the page editor."),
        {
          id: "features-1",
          type: "features",
          data: {
            heading: "What we do",
            items: [
              { title: "Strategy", description: "Define the right direction." },
              { title: "Design", description: "Create a cohesive experience." },
              { title: "Growth", description: "Turn traffic into outcomes." },
            ],
          },
        },
        ctaBlock("Ready to move faster?"),
      ],
      seoDefaults: {
        seoTitle: "Home",
        seoDescription: "Template starter home page.",
      },
    },
    {
      pageKey: "about",
      title: "About",
      slug: "/about",
      isRequired: true,
      allowedBlockTypes: ["hero", "richText", "stats", "gallery", "cta"],
      defaultBlocks: [
        heroBlock("About us", "Tell visitors who you are and what you stand for."),
        richTextBlock(
          "Our story",
          "Use this section to explain your company, mission, and values."
        ),
      ],
      seoDefaults: {
        seoTitle: "About",
        seoDescription: "Template starter about page.",
      },
    },
    {
      pageKey: "contact",
      title: "Contact",
      slug: "/contact",
      isRequired: true,
      allowedBlockTypes: ["hero", "contact", "richText", "cta"],
      defaultBlocks: [
        heroBlock("Contact us", "Make it easy for customers to reach your team."),
        {
          id: "contact-1",
          type: "contact",
          data: {
            heading: "Get in touch",
            email: "hello@example.com",
            phone: "",
            address: "",
            formEnabled: true,
          },
        },
      ],
      seoDefaults: {
        seoTitle: "Contact",
        seoDescription: "Template starter contact page.",
      },
    },
  ];

  if (options.processEnabled) {
    pages.push({
      pageKey: "process",
      title: "Process",
      slug: "/process",
      isRequired: false,
      allowedBlockTypes: ["hero", "richText", "features", "stats", "gallery", "cta"],
      defaultBlocks: [
        heroBlock("How we work", "Outline the process clients can expect."),
        richTextBlock(
          "A clear process",
          "Describe discovery, delivery, and what happens after launch."
        ),
      ],
      seoDefaults: {
        seoTitle: "Process",
        seoDescription: "Template starter process page.",
      },
    });
  }

  if (options.workEnabled) {
    pages.push({
      pageKey: "work",
      title: "Work",
      slug: "/work",
      isRequired: false,
      allowedBlockTypes: ["hero", "richText", "gallery", "cta"],
      defaultBlocks: [
        heroBlock("Selected work", "Introduce your case studies and highlights."),
        richTextBlock(
          "Recent projects",
          "This shell page can be used alongside the dedicated work module."
        ),
      ],
      seoDefaults: {
        seoTitle: "Work",
        seoDescription: "Template starter work page shell.",
      },
    });
  }

  return pages;
}
