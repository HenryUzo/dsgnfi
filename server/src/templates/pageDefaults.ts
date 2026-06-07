import type {
  AddablePageTemplateDefinition,
  SupportedPageDefinition,
  TemplateCategory,
} from "./types";

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

function blitStudioHeroBlock(title: string, subtitle: string, imageUrl: string) {
  return {
    id: "blit-studio-hero-1",
    type: "blitStudioHero" as const,
    data: {
      title,
      subtitle,
      imageUrl,
    },
  };
}

function blitPhilosophyBlock(heading: string, body: string) {
  return {
    id: `blit-${heading.replace(/\s+/g, "-").toLowerCase()}-1`,
    type: "blitPhilosophy" as const,
    data: {
      heading,
      body,
    },
  };
}

function blitManifestoBlock(heading: string, items: string[]) {
  return {
    id: "blit-manifesto-1",
    type: "blitManifesto" as const,
    data: {
      heading,
      items,
    },
  };
}

function blitOriginalsBlock(
  heading: string,
  projects: Array<{
    title: string;
    subtitle: string;
    image: string;
    href: string;
  }>
) {
  return {
    id: "blit-originals-1",
    type: "blitOriginals" as const,
    data: {
      heading,
      projects,
    },
  };
}

function blitCapabilitiesGridBlock(
  heading: string,
  imageUrl: string,
  items: Array<{
    title: string;
    description: string;
    imageUrl: string;
    imageAlt: string;
  }>
) {
  return {
    id: "blit-capabilities-1",
    type: "blitCapabilitiesGrid" as const,
    data: {
      heading,
      imageUrl,
      items,
    },
  };
}

function blitEditorialStatementBlock(eyebrow: string, title: string, body: string) {
  return {
    id: "blit-editorial-1",
    type: "blitEditorialStatement" as const,
    data: {
      eyebrow,
      title,
      body,
    },
  };
}

function blitStudioIntroBlock(body: string, kicker: string) {
  return {
    id: "blit-studio-intro-1",
    type: "blitStudioIntro" as const,
    data: {
      body,
      kicker,
    },
  };
}

function blitFormatStatementBlock(title: string, body: string, imageUrl: string) {
  return {
    id: "blit-format-statement-1",
    type: "blitFormatStatement" as const,
    data: {
      title,
      body,
      imageUrl,
    },
  };
}

function blitStudioImageStatementBlock(title: string, imageUrl: string, caption: string) {
  return {
    id: "blit-studio-image-statement-1",
    type: "blitStudioImageStatement" as const,
    data: {
      title,
      imageUrl,
      caption,
    },
  };
}

function blitTeamStatementBlock(
  title: string,
  people: Array<{
    name: string;
    role: string;
    imageUrl: string;
  }>
) {
  return {
    id: "blit-team-statement-1",
    type: "blitTeamStatement" as const,
    data: {
      title,
      people,
    },
  };
}

function blitAwardsBlock(heading: string, body: string, secondaryBody: string, imageUrl: string) {
  return {
    id: "blit-awards-1",
    type: "blitAwards" as const,
    data: {
      heading,
      body,
      secondaryBody,
      imageUrl,
    },
  };
}

function blitVideoQuoteBlock(
  videoUrl: string,
  kicker: string,
  quote: string,
  body: string,
  ctaLabel: string,
  ctaHref: string
) {
  return {
    id: "blit-video-quote-1",
    type: "blitVideoQuote" as const,
    data: {
      videoUrl,
      kicker,
      quote,
      body,
      ctaLabel,
      ctaHref,
    },
  };
}

function blitCareersBlock(
  title: string,
  body: string,
  jobs: Array<{
    title: string;
    href: string;
  }>
) {
  return {
    id: "blit-careers-1",
    type: "blitCareers" as const,
    data: {
      title,
      body,
      jobs,
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

function getCategoryPreset(category?: TemplateCategory) {
  switch (category) {
    case "healthcare":
      return {
        standardTitle: "Patient Guide",
        standardHeadline: "Help patients understand the next step",
        standardBody:
          "Use this page to explain care pathways, expectations, preparation, and how patients should proceed.",
        servicesTitle: "Care Services",
        teamTitle: "Care Team",
        faqTitle: "Patient FAQ",
        locationTitle: "Clinic Location",
        landingTitle: "Care Program",
      };
    case "education":
      return {
        standardTitle: "Student Guide",
        standardHeadline: "Help families understand this offering",
        standardBody:
          "Use this page to explain the program, the learner experience, and the outcome families should expect.",
        servicesTitle: "Learning Services",
        teamTitle: "Faculty Team",
        faqTitle: "Admissions FAQ",
        locationTitle: "Campus Location",
        landingTitle: "Enrollment Campaign",
      };
    case "food":
      return {
        standardTitle: "Dining Story",
        standardHeadline: "Introduce this dining experience clearly",
        standardBody:
          "Use this page to explain the concept, what guests can expect, and how to turn interest into bookings.",
        servicesTitle: "Dining Experiences",
        teamTitle: "Kitchen Team",
        faqTitle: "Guest FAQ",
        locationTitle: "Restaurant Location",
        landingTitle: "Seasonal Offer",
      };
    case "property":
      return {
        standardTitle: "Buyer Guide",
        standardHeadline: "Give buyers a clear path forward",
        standardBody:
          "Use this page to explain an offer, a property journey, or an area-specific opportunity in straightforward terms.",
        servicesTitle: "Property Services",
        teamTitle: "Advisory Team",
        faqTitle: "Buyer FAQ",
        locationTitle: "Office Location",
        landingTitle: "Listing Campaign",
      };
    case "logistics":
      return {
        standardTitle: "Operations Overview",
        standardHeadline: "Explain this service route or solution clearly",
        standardBody:
          "Use this page to explain the operational promise, service scope, and how clients should engage your team.",
        servicesTitle: "Logistics Solutions",
        teamTitle: "Operations Team",
        faqTitle: "Shipping FAQ",
        locationTitle: "Service Hub",
        landingTitle: "Route Campaign",
      };
    case "agency":
      return {
        standardTitle: "Engagement Overview",
        standardHeadline: "Explain the offer and the outcome clearly",
        standardBody:
          "Use this page to explain the engagement, the strategic value, and how a prospective client should move forward.",
        servicesTitle: "Capabilities",
        teamTitle: "Studio Team",
        faqTitle: "Client FAQ",
        locationTitle: "Studio Location",
        landingTitle: "Campaign Offer",
      };
    default:
      return {
        standardTitle: "New Page",
        standardHeadline: "New page headline",
        standardBody:
          "Replace this body copy with the story, offer, or explanation this page needs.",
        servicesTitle: "Services",
        teamTitle: "Team",
        faqTitle: "FAQ",
        locationTitle: "Location",
        landingTitle: "Landing Page",
      };
  }
}

function buildCommonAddablePageTemplates(
  category?: TemplateCategory
): AddablePageTemplateDefinition[] {
  const preset = getCategoryPreset(category);

  return [
    {
      templateKey: "standard-content",
      label: "Standard Content Page",
      description: "Hero, rich text, stats, and CTA sections for a general-purpose page.",
      defaultTitle: preset.standardTitle,
      allowedBlockTypes: ["hero", "richText", "stats", "cta", "gallery"],
      defaultBlocks: [
        heroBlock(
          preset.standardHeadline,
          "Introduce this page and the action you want visitors to take."
        ),
        richTextBlock(
          "Main content",
          preset.standardBody
        ),
        {
          id: "stats-1",
          type: "stats",
          data: {
            heading: "Proof points",
            items: [
              { label: "Metric one", value: "24+" },
              { label: "Metric two", value: "12" },
              { label: "Metric three", value: "98%" },
            ],
          },
        },
        ctaBlock("Ready to move forward?"),
      ],
      seoDefaults: {
        seoTitle: preset.standardTitle,
        seoDescription: "A template-approved standard content page.",
      },
    },
    {
      templateKey: "services-overview",
      label: "Services Overview",
      description: "Service-led page with feature groups, supporting copy, and CTA.",
      defaultTitle: preset.servicesTitle,
      allowedBlockTypes: ["hero", "features", "richText", "faq", "cta"],
      defaultBlocks: [
        heroBlock("Services that move the business", "Explain the outcomes this service page delivers."),
        {
          id: "features-1",
          type: "features",
          data: {
            heading: "Capabilities",
            items: [
              { title: "Strategy", description: "Prioritize the right work." },
              { title: "Execution", description: "Ship with consistency." },
              { title: "Optimization", description: "Improve after launch." },
            ],
          },
        },
        richTextBlock(
          "How engagements work",
          "Use this section to set expectations, scope, and timeline."
        ),
        ctaBlock("Book a discovery call"),
      ],
      seoDefaults: {
        seoTitle: preset.servicesTitle,
        seoDescription: "A template-approved services overview page.",
      },
    },
    {
      templateKey: "team-story",
      label: "Team Story",
      description: "An about-the-team page with story, proof points, gallery, and CTA.",
      defaultTitle: preset.teamTitle,
      allowedBlockTypes: ["hero", "richText", "stats", "gallery", "cta"],
      defaultBlocks: [
        heroBlock("Meet the team behind the work", "Introduce the people, principles, and leadership behind your delivery."),
        richTextBlock(
          "How the team works",
          "Use this section to explain how your team is structured, what clients can expect, and what makes the collaboration effective."
        ),
        {
          id: "stats-1",
          type: "stats",
          data: {
            heading: "Team highlights",
            items: [
              { label: "Years of experience", value: "15+" },
              { label: "Core disciplines", value: "6" },
              { label: "Client partners", value: "40+" },
            ],
          },
        },
        {
          id: "gallery-1",
          type: "gallery",
          data: {
            heading: "Inside the team",
            items: [
              {
                imageUrl: "https://example.com/team-1.jpg",
                alt: "Team collaboration session",
                caption: "Show how the team works together.",
              },
            ],
          },
        },
        ctaBlock("Talk with the team"),
      ],
      seoDefaults: {
        seoTitle: preset.teamTitle,
        seoDescription: "A template-approved team and culture page.",
      },
    },
    {
      templateKey: "faq-resource",
      label: "FAQ / Resource Page",
      description: "A page built around common questions, supporting copy, and a strong CTA.",
      defaultTitle: preset.faqTitle,
      allowedBlockTypes: ["hero", "richText", "faq", "cta"],
      defaultBlocks: [
        heroBlock("Answers before you ask", "Address common questions early and reduce friction in the buying journey."),
        richTextBlock(
          "What this page covers",
          "Use this section to explain who this FAQ is for and what decisions it helps visitors make."
        ),
        {
          id: "faq-1",
          type: "faq",
          data: {
            heading: "Common questions",
            items: [
              {
                question: "How does engagement start?",
                answer: "Outline the first call, scoping step, or onboarding process.",
              },
              {
                question: "What is included?",
                answer: "Summarize what is part of the offer and where custom scope begins.",
              },
            ],
          },
        },
        ctaBlock("Still have questions?", "Contact the team", "/contact"),
      ],
      seoDefaults: {
        seoTitle: preset.faqTitle,
        seoDescription: "A template-approved FAQ and resource page.",
      },
    },
    {
      templateKey: "location-contact",
      label: "Location / Contact Page",
      description: "A local presence page with intro copy, contact details, and CTA.",
      defaultTitle: preset.locationTitle,
      allowedBlockTypes: ["hero", "richText", "contact", "cta"],
      defaultBlocks: [
        heroBlock("Visit or contact this location", "Use this page for a branch, studio, office, or regional contact point."),
        richTextBlock(
          "What happens here",
          "Explain what services, appointments, or support this location provides."
        ),
        {
          id: "contact-1",
          type: "contact",
          data: {
            heading: "Location details",
            email: "hello@example.com",
            phone: "+234 000 000 0000",
            address: "Add the full street address here.",
            formEnabled: true,
          },
        },
        ctaBlock("Get directions or reach out", "Contact this location", "/contact"),
      ],
      seoDefaults: {
        seoTitle: preset.locationTitle,
        seoDescription: "A template-approved location and contact page.",
      },
    },
    {
      templateKey: "campaign-landing",
      label: "Campaign Landing Page",
      description: "A focused conversion page with hero, benefits, proof, and CTA.",
      defaultTitle: preset.landingTitle,
      allowedBlockTypes: ["hero", "features", "stats", "cta"],
      defaultBlocks: [
        heroBlock("A focused offer with one clear next step", "Use this page for a campaign, launch, lead magnet, or time-bound offer."),
        {
          id: "features-1",
          type: "features",
          data: {
            heading: "Why this matters",
            items: [
              { title: "Clear outcome", description: "State the primary result for the visitor." },
              { title: "Low friction", description: "Make the next step simple and obvious." },
              { title: "Trust signal", description: "Show why the offer is credible." },
            ],
          },
        },
        {
          id: "stats-1",
          type: "stats",
          data: {
            heading: "Proof",
            items: [
              { label: "Teams served", value: "120+" },
              { label: "Average turnaround", value: "2 weeks" },
              { label: "Satisfaction", value: "97%" },
            ],
          },
        },
        ctaBlock("Claim the next step", "Start now", "/contact"),
      ],
      seoDefaults: {
        seoTitle: preset.landingTitle,
        seoDescription: "A template-approved campaign landing page.",
      },
    },
  ];
}

function buildAgencyAddablePageTemplates(): AddablePageTemplateDefinition[] {
  return [
    {
      templateKey: "studio-profile",
      label: "Studio Profile",
      description:
        "A cinematic editorial studio page inspired by the Blit reference, with bold typography, motion-led sections, and immersive portfolio storytelling.",
      defaultTitle: "Our Studio",
      allowedBlockTypes: [
        "blitStudioHero",
        "blitStudioIntro",
        "blitPhilosophy",
        "blitFormatStatement",
        "blitOriginals",
        "blitStudioImageStatement",
        "blitTeamStatement",
        "blitCapabilitiesGrid",
        "blitAwards",
        "blitVideoQuote",
        "blitCareers",
        "blitManifesto",
        "blitEditorialStatement",
      ],
      defaultBlocks: [
        blitStudioHeroBlock(
          "Designers of experiential conditions that outlive the moment.",
          "blit. creates immersive visual environments for culture, brands, and moments meant to be shared.",
          "/assets/blit-hero-bust.jpg"
        ),
        blitStudioIntroBlock(
          "Since 2015, museums, cultural institutions, brands, and event creators have turned to blit. when the aim isn't simply to show something, but to shape how it's felt and how long it stays.",
          "from digital scenography and large-scale installations to interactive and virtual experiences, blit. designs situations where space, story, and presence collide and meaning appears through experiencing, not watching."
        ),
        blitPhilosophyBlock(
          "what drives us",
          "The studio sits between creative direction, technical production, and experiential design. Every brief is treated as a spatial condition: what people see, how they move, what they remember, and how long the feeling survives after the lights come up."
        ),
        blitFormatStatementBlock(
          "no format is too big, no challenge too complex.",
          "Alongside commissioned work, the studio authors blit.ORIGINALS, its own experiential platforms, not just one-off projects. Experiences like NOCTURNA, ECHOES, and PORTALIS are developed, owned, and evolved from within the studio, existing as ready-to-deploy platforms.",
          "/assets/blit-tv-helmet-portrait.jpg"
        ),
        blitOriginalsBlock("originals & formats", [
          {
            title: "Nocturna",
            subtitle: "Immersive event platform",
            image: "/assets/blit-echoes-installation.jpg",
            href: "/work",
          },
          {
            title: "Echoes",
            subtitle: "Spatial audiovisual installation",
            image: "/assets/blit-data-ism-installation.jpg",
            href: "/work",
          },
          {
            title: "Portalis",
            subtitle: "Ready-to-deploy interactive format",
            image: "/assets/blit-cosmic-portal.jpg",
            href: "/work",
          },
        ]),
        blitStudioImageStatementBlock(
          "from studio floor to public memory",
          "/assets/blit-studio-team.jpg",
          "A working studio of artists, technologists, directors, producers, and systems thinkers."
        ),
        blitTeamStatementBlock(
          "Some call it immersive. Others call it experiential. Audiences all say the same thing: It's the thing that stays with you.",
          [
            {
              name: "Marc Colomines",
              role: "Creative Managing Director",
              imageUrl: "/assets/blit-team-marc.jpg",
            },
            {
              name: "Lara de la Puente Aldea",
              role: "Motion designer & TouchDesigner Artist",
              imageUrl: "/assets/blit-team-lara.jpg",
            },
            {
              name: "Hector Mas",
              role: "Project Manager",
              imageUrl: "/assets/blit-team-hector.jpg",
            },
          ]
        ),
        blitCapabilitiesGridBlock(
          "team & disciplines",
          "/assets/blit-zayed-dome.jpg",
          [
            {
              title: "Spatial storytelling",
              description:
                "Explain how narrative, scenography, and movement guide the audience through the experience.",
              imageUrl: "/assets/blit-zayed-dome.jpg",
              imageAlt: "Immersive dome installation",
            },
            {
              title: "Realtime systems",
              description:
                "Show how technical direction, live engines, and responsive visuals support the concept without flattening it.",
              imageUrl: "/assets/blit-cosmic-portal.jpg",
              imageAlt: "Portal-inspired immersive environment",
            },
            {
              title: "Motion & atmosphere",
              description:
                "Use this slot for the team members, collaborators, or production disciplines that shape the final emotional tone.",
              imageUrl: "/assets/blit-tv-helmet-portrait.jpg",
              imageAlt: "Portrait from the studio system",
            },
            {
              title: "Original platforms",
              description:
                "Describe the proprietary formats, reusable systems, or authored experiences the studio can adapt for new clients.",
              imageUrl: "/assets/blit-echoes-installation.jpg",
              imageAlt: "Original immersive platform visual",
            },
          ]
        ),
        blitAwardsBlock(
          "awards",
          "blit. has been recognized with awards like LAUS and Evento Plus, and has made its mark internationally with honors at Moscow's Circle of Light festival.",
          "Accolades aside, what drives this studio is the pursuit of the unexpected. The work looks past the obvious frame and turns constraints into a new operating system.",
          "/assets/blit-office.jpg"
        ),
        blitVideoQuoteBlock(
          "/assets/blit-hero-reel.mp4",
          "And the question we asked ourselves: what got us here? Well... not knowing how to say no.",
          "like Mark Twain said, \"they didn't know it was impossible, so they did it.\"",
          "And that's exactly how we roll. Ready to create something unforgettable?",
          "let's talk",
          "/contact"
        ),
        blitCareersBlock(
          "Careers",
          "ready for something different? check out our open positions and contact us to join our studio.",
          [
            { title: "Technical Artist", href: "/contact" },
            { title: "Environment artist - Unreal engine", href: "/contact" },
            { title: "Freelancers", href: "/contact" },
          ]
        ),
        blitManifestoBlock("how we work", [
          "Make spectacle carry meaning.",
          "Prototype quickly, then refine the emotional logic.",
          "Let space, story, and presence collide.",
          "Build the thing people keep talking about after they leave.",
        ]),
        blitEditorialStatementBlock(
          "awards & momentum",
          "Recognized work matters, but unforgettable work matters more.",
          "Use this closing statement for recognition, ambition, and your final invitation. The best version balances credibility with hunger, then hands people off to the footer CTA to start the conversation."
        ),
      ],
      seoDefaults: {
        seoTitle: "Our Studio",
        seoDescription:
          "A template-approved editorial studio page with immersive portfolio storytelling.",
      },
    },
    {
      templateKey: "case-study-index",
      label: "Case Study Index",
      description: "A page for summarizing selected client outcomes, categories, and proof.",
      defaultTitle: "Case Studies",
      allowedBlockTypes: ["hero", "richText", "stats", "gallery", "cta"],
      defaultBlocks: [
        heroBlock("Case studies that show the work in context", "Use this page to frame outcomes, industries, and how to explore the portfolio."),
        richTextBlock(
          "What to expect",
          "Explain the type of projects featured here, how they are organized, and what a prospective client should pay attention to."
        ),
        {
          id: "stats-1",
          type: "stats",
          data: {
            heading: "Selected outcomes",
            items: [
              { label: "Brands launched", value: "18" },
              { label: "Campaigns shipped", value: "75+" },
              { label: "Average lift", value: "32%" },
            ],
          },
        },
        ctaBlock("Explore the work"),
      ],
      seoDefaults: {
        seoTitle: "Case Studies",
        seoDescription: "A template-approved agency case study overview page.",
      },
    },
    {
      templateKey: "capabilities-grid",
      label: "Capabilities Grid",
      description: "A service capabilities page tailored for agencies and consultancies.",
      defaultTitle: "Capabilities",
      allowedBlockTypes: ["hero", "features", "richText", "cta"],
      defaultBlocks: [
        heroBlock("Capabilities built for momentum", "Summarize the combined strategic, creative, and delivery capabilities your team brings."),
        {
          id: "features-1",
          type: "features",
          data: {
            heading: "Core capabilities",
            items: [
              { title: "Positioning", description: "Clarify how the brand should win attention." },
              { title: "Creative Systems", description: "Build repeatable, flexible visual language." },
              { title: "Digital Delivery", description: "Ship the experience with operational rigor." },
            ],
          },
        },
        ctaBlock("Start a capability review"),
      ],
      seoDefaults: {
        seoTitle: "Capabilities",
        seoDescription: "A template-approved agency capabilities page.",
      },
    },
  ];
}

function buildClinicAddablePageTemplates(): AddablePageTemplateDefinition[] {
  return [
    {
      templateKey: "doctor-profile-list",
      label: "Doctor / Care Team Page",
      description: "A trust-building page for clinicians, specialties, and patient confidence signals.",
      defaultTitle: "Our Doctors",
      allowedBlockTypes: ["hero", "richText", "stats", "gallery", "cta"],
      defaultBlocks: [
        heroBlock("Meet the care team", "Introduce the clinicians, specialties, and approach to patient care."),
        richTextBlock(
          "Clinical approach",
          "Use this section to explain how patients are cared for, how appointments work, and what differentiates the team."
        ),
        {
          id: "stats-1",
          type: "stats",
          data: {
            heading: "Patient confidence",
            items: [
              { label: "Practitioners", value: "12" },
              { label: "Years combined experience", value: "60+" },
              { label: "Patient rating", value: "4.9/5" },
            ],
          },
        },
        ctaBlock("Book an appointment"),
      ],
      seoDefaults: {
        seoTitle: "Our Doctors",
        seoDescription: "A template-approved clinic doctor and care team page.",
      },
    },
    {
      templateKey: "service-line",
      label: "Service Line / Specialty Page",
      description: "A service page for a clinic specialty, treatment area, or program.",
      defaultTitle: "Specialty",
      allowedBlockTypes: ["hero", "features", "faq", "cta"],
      defaultBlocks: [
        heroBlock("Care for a specific need", "Use this page for a specialty, treatment category, or patient pathway."),
        {
          id: "features-1",
          type: "features",
          data: {
            heading: "What this specialty covers",
            items: [
              { title: "Assessment", description: "Explain first consultation or evaluation." },
              { title: "Treatment", description: "Describe core interventions or care options." },
              { title: "Follow-up", description: "Set expectations for ongoing care." },
            ],
          },
        },
        ctaBlock("Schedule care"),
      ],
      seoDefaults: {
        seoTitle: "Specialty",
        seoDescription: "A template-approved clinic specialty page.",
      },
    },
  ];
}

function buildSchoolAddablePageTemplates(): AddablePageTemplateDefinition[] {
  return [
    {
      templateKey: "program-overview",
      label: "Program Overview",
      description: "A page for a school program, faculty, or academic pathway.",
      defaultTitle: "Programs",
      allowedBlockTypes: ["hero", "features", "richText", "cta"],
      defaultBlocks: [
        heroBlock("Programs built for growth", "Explain the program, who it serves, and what learners will gain."),
        {
          id: "features-1",
          type: "features",
          data: {
            heading: "What students can expect",
            items: [
              { title: "Curriculum", description: "Outline the learning structure and progression." },
              { title: "Faculty", description: "Describe how students are supported." },
              { title: "Outcomes", description: "Show what graduates or learners achieve." },
            ],
          },
        },
        ctaBlock("Request admissions information"),
      ],
      seoDefaults: {
        seoTitle: "Programs",
        seoDescription: "A template-approved academic program page.",
      },
    },
    {
      templateKey: "admissions-guide",
      label: "Admissions Guide",
      description: "A page for admissions steps, documents, deadlines, and FAQs.",
      defaultTitle: "Admissions",
      allowedBlockTypes: ["hero", "richText", "faq", "cta"],
      defaultBlocks: [
        heroBlock("Everything applicants need to know", "Use this page to explain deadlines, steps, and what families should prepare."),
        richTextBlock(
          "How admissions works",
          "Summarize the admissions flow, what is required, and how questions are handled."
        ),
        {
          id: "faq-1",
          type: "faq",
          data: {
            heading: "Admissions FAQ",
            items: [
              { question: "When do applications open?", answer: "Add the yearly admissions timeline here." },
              { question: "What documents are required?", answer: "List the forms, transcripts, and other materials applicants submit." },
            ],
          },
        },
        ctaBlock("Start an application", "Contact admissions", "/contact"),
      ],
      seoDefaults: {
        seoTitle: "Admissions",
        seoDescription: "A template-approved admissions information page.",
      },
    },
  ];
}

function buildRestaurantAddablePageTemplates(): AddablePageTemplateDefinition[] {
  return [
    {
      templateKey: "menu-highlights",
      label: "Menu Highlights",
      description: "A page for signature dishes, categories, and reservation-focused conversion.",
      defaultTitle: "Menu",
      allowedBlockTypes: ["hero", "features", "gallery", "cta"],
      defaultBlocks: [
        heroBlock("Signature dishes worth planning around", "Use this page to frame the menu, specialties, and dining point of view."),
        {
          id: "features-1",
          type: "features",
          data: {
            heading: "Menu highlights",
            items: [
              { title: "Seasonal plates", description: "Highlight time-bound or chef-driven items." },
              { title: "Core favorites", description: "Show what regular guests come back for." },
              { title: "Drinks pairing", description: "Point visitors toward cocktails, wine, or tasting options." },
            ],
          },
        },
        ctaBlock("Reserve a table", "Book now", "/contact"),
      ],
      seoDefaults: {
        seoTitle: "Menu",
        seoDescription: "A template-approved restaurant menu highlights page.",
      },
    },
    {
      templateKey: "private-dining",
      label: "Private Dining / Events",
      description: "A page for event bookings, group reservations, and venue packages.",
      defaultTitle: "Private Dining",
      allowedBlockTypes: ["hero", "richText", "gallery", "contact", "cta"],
      defaultBlocks: [
        heroBlock("Events designed around the table", "Use this page for private dining, celebrations, and hosted experiences."),
        richTextBlock(
          "What you can host",
          "Explain venue capacity, event style, package options, and booking expectations."
        ),
        {
          id: "contact-1",
          type: "contact",
          data: {
            heading: "Event enquiries",
            email: "events@example.com",
            phone: "",
            address: "",
            formEnabled: true,
          },
        },
        ctaBlock("Plan an event", "Enquire now", "/contact"),
      ],
      seoDefaults: {
        seoTitle: "Private Dining",
        seoDescription: "A template-approved restaurant events and private dining page.",
      },
    },
  ];
}

function buildRealEstateAddablePageTemplates(): AddablePageTemplateDefinition[] {
  return [
    {
      templateKey: "listing-collection",
      label: "Listings Overview",
      description: "A page for property categories, buying paths, and sales proof.",
      defaultTitle: "Listings",
      allowedBlockTypes: ["hero", "features", "stats", "cta"],
      defaultBlocks: [
        heroBlock("Listings presented with clarity", "Use this page to frame inventory, buyer paths, and how enquiries should start."),
        {
          id: "features-1",
          type: "features",
          data: {
            heading: "Property journey",
            items: [
              { title: "Browse availability", description: "Explain property types and inventory flow." },
              { title: "Schedule a tour", description: "Set the next step for interested buyers." },
              { title: "Close with confidence", description: "Show what support exists after enquiry." },
            ],
          },
        },
        ctaBlock("Request listing details"),
      ],
      seoDefaults: {
        seoTitle: "Listings",
        seoDescription: "A template-approved real estate listings overview page.",
      },
    },
    {
      templateKey: "neighborhood-guide",
      label: "Neighborhood Guide",
      description: "A page for area highlights, amenities, and community trust-building.",
      defaultTitle: "Neighborhood Guide",
      allowedBlockTypes: ["hero", "richText", "stats", "gallery", "cta"],
      defaultBlocks: [
        heroBlock("A guide to the neighborhood", "Use this page to help buyers understand the lifestyle, location, and reasons to choose the area."),
        richTextBlock(
          "Why people choose this area",
          "Describe commute advantages, amenities, schools, community feel, and long-term value."
        ),
        ctaBlock("Talk with an agent"),
      ],
      seoDefaults: {
        seoTitle: "Neighborhood Guide",
        seoDescription: "A template-approved local area and neighborhood guide page.",
      },
    },
  ];
}

function buildLogisticsAddablePageTemplates(): AddablePageTemplateDefinition[] {
  return [
    {
      templateKey: "coverage-map",
      label: "Coverage / Service Area",
      description: "A page for regional coverage, lanes, service levels, and response expectations.",
      defaultTitle: "Coverage",
      allowedBlockTypes: ["hero", "features", "stats", "cta"],
      defaultBlocks: [
        heroBlock("Coverage built around reliability", "Use this page to explain service footprint, lane strength, and operational confidence."),
        {
          id: "features-1",
          type: "features",
          data: {
            heading: "Coverage highlights",
            items: [
              { title: "Core routes", description: "Summarize the strongest service lanes or corridors." },
              { title: "Response model", description: "Explain how requests are handled and dispatched." },
              { title: "Visibility", description: "Show how clients track movement and communication." },
            ],
          },
        },
        ctaBlock("Request route support"),
      ],
      seoDefaults: {
        seoTitle: "Coverage",
        seoDescription: "A template-approved logistics coverage page.",
      },
    },
    {
      templateKey: "industry-solutions",
      label: "Industry Solutions",
      description: "A page for vertical-specific logistics offers and operational proof.",
      defaultTitle: "Industry Solutions",
      allowedBlockTypes: ["hero", "features", "richText", "cta"],
      defaultBlocks: [
        heroBlock("Logistics built for specific industries", "Use this page to explain vertical specialization and how operations adapt to each sector."),
        {
          id: "features-1",
          type: "features",
          data: {
            heading: "Solution areas",
            items: [
              { title: "Retail", description: "Explain store, inventory, or last-mile coordination." },
              { title: "Healthcare", description: "Outline controlled handling or time-sensitive movement." },
              { title: "Industrial", description: "Describe large-scale or recurring movement patterns." },
            ],
          },
        },
        ctaBlock("Discuss your supply chain"),
      ],
      seoDefaults: {
        seoTitle: "Industry Solutions",
        seoDescription: "A template-approved logistics industry solutions page.",
      },
    },
  ];
}

export function buildStarterAddablePageTemplates(
  category?: TemplateCategory
): AddablePageTemplateDefinition[] {
  const common = buildCommonAddablePageTemplates(category);

  switch (category) {
    case "agency":
      return [...common, ...buildAgencyAddablePageTemplates()];
    case "healthcare":
      return [...common, ...buildClinicAddablePageTemplates()];
    case "education":
      return [...common, ...buildSchoolAddablePageTemplates()];
    case "food":
      return [...common, ...buildRestaurantAddablePageTemplates()];
    case "property":
      return [...common, ...buildRealEstateAddablePageTemplates()];
    case "logistics":
      return [...common, ...buildLogisticsAddablePageTemplates()];
    default:
      return common;
  }
}
