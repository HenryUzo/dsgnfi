import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 15000 });

process.env.NODE_ENV = "development";
process.env.CORS_ORIGIN = "http://localhost:5174";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.DEFAULT_TENANT_SLUG = "dsgnfi";
process.env.DEFAULT_SITE_SLUG = "main";
process.env.ALLOW_DEV_SITE_QUERY_OVERRIDE = "true";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.OPENAI_API_KEY = "";
process.env.OPENAI_MODEL = "";

const openAiMocks = vi.hoisted(() => ({
  constructor: vi.fn(),
  responsesCreate: vi.fn(),
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation((options) => {
    openAiMocks.constructor(options);
    return {
      responses: {
        create: openAiMocks.responsesCreate,
      },
    };
  }),
}));

const mockPrisma = {
  membership: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  site: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  siteDomain: {
    findFirst: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("../src/db/prisma", () => ({
  prisma: mockPrisma,
}));

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

async function createAdminCookie() {
  const { signToken } = await import("../src/auth/jwt");
  const token = signToken({ id: "admin-1", email: "admin@example.com" });
  return `cms_token=${token}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = "";
  process.env.OPENAI_MODEL = "";

  mockPrisma.membership.findMany.mockResolvedValue([
    {
      userId: "admin-1",
      tenantId: "tenant-1",
      role: "OWNER",
      tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" },
    },
  ]);
  mockPrisma.membership.findFirst.mockResolvedValue({
    userId: "admin-1",
    tenantId: "tenant-1",
    role: "OWNER",
  });
  mockPrisma.site.findFirst.mockResolvedValue({
    id: "site-1",
    tenantId: "tenant-1",
    slug: "main",
    status: "ACTIVE",
    isDefault: true,
    tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" },
  });
  mockPrisma.site.findUnique.mockResolvedValue(null);
  mockPrisma.siteDomain.findFirst.mockResolvedValue(null);
  mockPrisma.auditLog.create.mockResolvedValue({});
  openAiMocks.responsesCreate.mockResolvedValue({
    output_text: JSON.stringify({
      intro: "You're on Page Editor.",
      steps: ["Open Pages.", "Choose the page.", "Save the draft, then publish."],
      note: "This assistant can guide you, but it does not publish for you.",
      links: [{ label: "Open Pages", href: "/admin/pages" }],
    }),
  });
});

describe("admin AI guide chat", () => {
  it("requires admin authentication", async () => {
    const app = await createTestApp();

    const response = await request(app).post("/admin/ai/chat").send({
      messages: [{ role: "user", content: "How do I publish?" }],
      context: { route: "/admin/pages", screenTitle: "Pages" },
    });

    expect(response.status).toBe(401);
    expect(openAiMocks.responsesCreate).not.toHaveBeenCalled();
  });

  it("returns validation errors for invalid requests", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/admin/ai/chat")
      .set("Cookie", await createAdminCookie())
      .send({
        messages: [],
        context: { route: "", screenTitle: "" },
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("validation_failed");
    expect(response.body.error.fieldErrors.messages).toBeTruthy();
    expect(response.body.error.fieldErrors.context).toBeTruthy();
    expect(openAiMocks.responsesCreate).not.toHaveBeenCalled();
  });

  it("returns 503 when OpenAI is not configured", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/admin/ai/chat")
      .set("Cookie", await createAdminCookie())
      .send({
        messages: [{ role: "user", content: "How do I publish?" }],
        context: { route: "/admin/pages", screenTitle: "Pages" },
      });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("openai_not_configured");
    expect(openAiMocks.responsesCreate).not.toHaveBeenCalled();
  });

  it("creates a read-only OpenAI response with admin context", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OPENAI_MODEL = "gpt-5-mini";
    const app = await createTestApp();

    const response = await request(app)
      .post("/admin/ai/chat")
      .set("Cookie", await createAdminCookie())
      .send({
        messages: [{ role: "user", content: "How do I publish this page?" }],
        context: {
          route: "/admin/pages/about",
          screenTitle: "Page Editor",
          tenantName: "Dsgnfi",
          siteName: "Main Site",
          role: "OWNER",
          pageEditor: {
            pageKey: "about",
            title: "About",
            slug: "/about",
            pageTemplateKey: "standard-page",
            allowedBlockTypes: ["hero", "richText"],
            blockTypes: ["hero", "richText"],
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      message: {
        role: "assistant",
        content: "You're on Page Editor. 1. Open Pages. 2. Choose the page. 3. Save the draft, then publish. Note: This assistant can guide you, but it does not publish for you.",
        guide: {
          intro: "You're on Page Editor.",
          steps: ["Open Pages.", "Choose the page.", "Save the draft, then publish."],
          note: "This assistant can guide you, but it does not publish for you.",
          why: "Publishing happens from the page editor or the Pages list after saving draft changes.",
          intentId: "publish_page",
          primaryLink: { label: "Open page editor", href: "/admin/pages/about" },
          links: [
            { label: "Open page editor", href: "/admin/pages/about" },
            { label: "Pages", href: "/admin/pages" },
          ],
        },
      },
    });
    expect(openAiMocks.constructor).toHaveBeenCalledWith({ apiKey: "test-openai-key" });
    expect(openAiMocks.responsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5-mini",
        store: false,
        text: {
          format: expect.objectContaining({
            type: "json_schema",
            name: "admin_guide_response",
          }),
        },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "How do I publish this page?",
              },
            ],
          },
        ],
      })
    );

    const requestPayload = openAiMocks.responsesCreate.mock.calls[0]?.[0];
    expect(requestPayload.instructions).toContain("You are read-only");
    expect(requestPayload.instructions).toContain("Route: /admin/pages/about");
    expect(requestPayload.instructions).toContain("Current block types: hero, richText");
    expect(requestPayload.instructions).toContain("Guide metadata JSON");
    expect(requestPayload.instructions).toContain("\"id\":\"publish_page\"");
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorAdminUserId: "admin-1",
        siteId: "site-1",
        action: "AI_GUIDE_REQUESTED",
        entityType: "AdminAiGuide",
        entityId: "publish_page",
        metadata: expect.objectContaining({
          route: "/admin/pages/about",
          screenTitle: "Page Editor",
          messageCount: 1,
          attachmentCount: 0,
          intentId: "publish_page",
          returnedLinkCount: 2,
        }),
      }),
    });
    expect(JSON.stringify(mockPrisma.auditLog.create.mock.calls[0]?.[0])).not.toContain(
      "How do I publish this page?"
    );
  });

  it("passes image and document attachments into the latest user message", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OPENAI_MODEL = "gpt-5-mini";
    const app = await createTestApp();

    const response = await request(app)
      .post("/admin/ai/chat")
      .set("Cookie", await createAdminCookie())
      .send({
        messages: [{ role: "user", content: "How do I use these files?" }],
        context: { route: "/admin/site-settings", screenTitle: "Site Settings" },
        attachments: [
          {
            name: "layout.png",
            mimeType: "image/png",
            kind: "image",
            dataUrl: "data:image/png;base64,ZmFrZQ==",
          },
          {
            name: "brief.pdf",
            mimeType: "application/pdf",
            kind: "document",
            dataUrl: "data:application/pdf;base64,cGRm",
          },
        ],
      });

    expect(response.status).toBe(200);

    const requestPayload = openAiMocks.responsesCreate.mock.calls.at(-1)?.[0];
    expect(requestPayload.input).toEqual([
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "How do I use these files?",
          },
          {
            type: "input_image",
            detail: "auto",
            image_url: "data:image/png;base64,ZmFrZQ==",
          },
          {
            type: "input_file",
            file_data: "data:application/pdf;base64,cGRm",
            filename: "brief.pdf",
          },
        ],
      },
    ]);
    expect(requestPayload.instructions).toContain("image: layout.png (image/png)");
    expect(requestPayload.instructions).toContain("document: brief.pdf (application/pdf)");
  });

  it.each([
    ["How do I edit navigation?", "edit_navigation", "/admin/site-settings"],
    ["How do I add a custom domain?", "manage_domains", "/admin/site-settings"],
    ["How do I import a template?", "manage_templates", "/admin/templates"],
    ["How do I switch site?", "switch_site", "/admin/sites"],
    ["How do I create a new site?", "create_site", "/admin/sites"],
    ["How do I manage work projects?", "manage_work", "/admin/work"],
    ["How do I update process capabilities?", "manage_process", "/admin/process"],
  ])("returns deterministic route for %s", async (prompt, intentId, href) => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    const app = await createTestApp();

    const response = await request(app)
      .post("/admin/ai/chat")
      .set("Cookie", await createAdminCookie())
      .send({
        messages: [{ role: "user", content: prompt }],
        context: { route: "/admin", screenTitle: "Dashboard" },
      });

    expect(response.status).toBe(200);
    expect(response.body.message.guide.intentId).toBe(intentId);
    expect(response.body.message.guide.primaryLink.href).toBe(href);
    expect(response.body.message.guide.links.every((link: { href: string }) => link.href.startsWith("/admin"))).toBe(true);
  });

  it("keeps responding when the optional audit client is unavailable", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    const auditLog = mockPrisma.auditLog;
    (mockPrisma as { auditLog?: unknown }).auditLog = undefined;
    const app = await createTestApp();

    const response = await request(app)
      .post("/admin/ai/chat")
      .set("Cookie", await createAdminCookie())
      .send({
        messages: [{ role: "user", content: "How do I publish?" }],
        context: { route: "/admin/pages", screenTitle: "Pages" },
      });

    expect(response.status).toBe(200);
    (mockPrisma as { auditLog?: unknown }).auditLog = auditLog;
  });
});

describe("admin AI page prefill", () => {
  const companyProfileText = [
    "DSGNFI STUDIO",
    "Company Profile",
    "Positioning Statement",
    "We help businesses become clearer, more visible, and more trusted through strategy-led creative work, digital campaigns, and modern web experiences.",
    "1. About Dsgnfi Studio",
    "Dsgnfi Studio is a creative digital studio that helps businesses build strong, professional, and memorable brands through digital marketing, brand design, and web development.",
    "2.1 Digital Marketing",
    "We help businesses promote their products and services online using strategy, content, paid advertising, and performance tracking.",
    "2.2 Brand Design",
    "We create visual identities that help businesses stand out, look professional, and build trust with customers.",
    "2.3 Web Development",
    "We design and build websites that help businesses present themselves professionally and convert visitors into customers.",
    "Who We Work With",
    "Startups, SMEs, personal brands, service businesses, corporate teams, and growing organizations.",
    "Value Promise",
    "We connect brand clarity, digital visibility, and web performance into one coherent growth system.",
  ].join("\n");

  const blitHomePage = {
    pageKey: "home",
    title: "Home",
    slug: "/",
    seoTitle: null,
    seoDescription: null,
    allowedBlockTypes: ["blitHeroCollage", "blitFeaturedWork", "blitEditorialStatement", "blitCapabilitiesGrid", "blitHorizontalGallery", "blitFinalStatement"],
    blocks: [
      {
        id: "blit-home-hero",
        type: "blitHeroCollage",
        data: {
          eyebrow: "Blit Studio",
          headline: "the intersection between design, art, and technology",
          caption: "Creative technology studio for immersive events and interactive storytelling.",
          images: [{ imageUrl: "/assets/hero.jpg", alt: "Hero" }],
        },
      },
      {
        id: "blit-home-featured",
        type: "blitFeaturedWork",
        data: {
          heading: "featured work",
          title: "Selected projects",
          ctaLabel: "See all projects",
          ctaHref: "/works",
          projects: [
            { title: "ECHOES", category: "Installation", description: "Old", image: "/assets/echoes.jpg", href: "/work/echoes" },
            { title: "BMW", category: "Event", description: "Old", image: "/assets/bmw.jpg", href: "/work/bmw" },
          ],
        },
      },
      {
        id: "blit-home-editorial",
        type: "blitEditorialStatement",
        data: { eyebrow: "Studio statement", title: "Old title", body: "Old body" },
      },
      {
        id: "blit-home-capabilities",
        type: "blitCapabilitiesGrid",
        data: {
          heading: "capabilities",
          imageUrl: "/assets/capabilities.jpg",
          items: [
            { title: "Old", description: "Old", imageUrl: "/assets/digital.jpg", imageAlt: "Digital" },
            { title: "Old", description: "Old", imageUrl: "/assets/brand.jpg", imageAlt: "Brand" },
            { title: "Old", description: "Old", imageUrl: "/assets/web.jpg", imageAlt: "Web" },
          ],
        },
      },
      {
        id: "blit-home-final",
        type: "blitFinalStatement",
        data: { title: "old final" },
      },
    ],
  };

  function testArtifact() {
    return {
      id: "artifact-1",
      adminId: "admin-1",
      tenantId: "tenant-1",
      siteId: "site-1",
      pageKey: "home",
      name: "Dsgnfi_Studio_Company_Profile.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      kind: "document" as const,
      sizeBytes: 1234,
      dataUrl: "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,ZmFrZQ==",
      extractedText: companyProfileText,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    };
  }

  it("returns interpreted analysis and sanitized multi-block suggestions for unordered company briefs", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    openAiMocks.responsesCreate.mockResolvedValueOnce({
      output_text: JSON.stringify({
        analysis: {
          brandName: "DSGNFI Studio",
          positioning: "A creative digital studio helping businesses build clearer brands, stronger campaigns, and modern web experiences.",
          audience: ["Startups", "SMEs", "Service businesses"],
          services: ["Digital Marketing", "Brand Design", "Web Development"],
          tone: "clear, professional, strategy-led",
          notes: ["The brief maps service content into homepage capabilities and featured sections."],
        },
        page: {
          title: null,
          seoTitle: companyProfileText.slice(0, 150),
          seoDescription: "DSGNFI Studio helps businesses clarify their brand, improve visibility, and build modern web experiences.",
        },
        blocks: [
          {
            blockId: "blit-home-hero",
            blockType: "blitHeroCollage",
            label: "Blit Hero Collage",
            summary: "Uses the positioning statement for the hero.",
            dataPatchJson: JSON.stringify({
              eyebrow: "DSGNFI Studio",
              headline: "clearer brands, stronger campaigns, modern web experiences",
              caption: "A creative digital studio helping businesses become clearer, more visible, and more trusted.",
            }),
            confidence: 0.91,
            notes: "Mapped from positioning.",
          },
          {
            blockId: "blit-home-featured",
            blockType: "blitFeaturedWork",
            label: "Blit Featured Work",
            summary: "Converts service pillars into featured cards.",
            dataPatchJson: JSON.stringify({
              heading: "what we do",
              title: "Strategy-led creative services",
              projects: [
                { title: "Digital Marketing", category: "Service", description: "Campaigns, content, paid advertising, and performance tracking." },
                { title: "Brand Design", category: "Service", description: "Identity systems, brand guidelines, and marketing assets." },
              ],
            }),
            confidence: 0.86,
            notes: "Existing media should be preserved.",
          },
          {
            blockId: "blit-home-capabilities",
            blockType: "blitCapabilitiesGrid",
            label: "Blit Capabilities Grid",
            summary: "Maps service lines into capabilities.",
            dataPatchJson: JSON.stringify({
              heading: "capabilities",
              items: [
                { title: "Digital Marketing", description: "Clear campaigns that turn attention into business opportunities." },
                { title: "Brand Design", description: "Identity systems that make businesses look credible and consistent." },
                { title: "Web Development", description: "Modern websites built to convert visitors into customers." },
              ],
            }),
            confidence: 0.9,
            notes: "Service content is explicit in the brief.",
          },
        ],
      }),
    });
    const { createPagePrefillSuggestions } = await import("../src/services/adminAiPrefill");

    const suggestions = await createPagePrefillSuggestions({
      adminId: "admin-1",
      artifacts: [testArtifact()],
      page: blitHomePage,
    });

    expect(suggestions.analysis?.brandName).toBe("DSGNFI Studio");
    expect(suggestions.blocks.map((block) => block.blockType)).toEqual([
      "blitHeroCollage",
      "blitFeaturedWork",
      "blitCapabilitiesGrid",
      "blitEditorialStatement",
      "blitFinalStatement",
    ]);
    expect(suggestions.page.seoTitle).not.toContain("Positioning Statement");
    expect(suggestions.page.seoTitle?.length).toBeLessThanOrEqual(72);
    const featured = suggestions.blocks.find((block) => block.blockType === "blitFeaturedWork");
    const projects = featured?.dataPatch.projects as Array<{ image?: string; href?: string }>;
    expect(projects[0]?.image).toBe("/assets/echoes.jpg");
    expect(projects[0]?.href).toBe("/work/echoes");
  });

  it("uses deterministic fallback only when model output has no valid block patches", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    openAiMocks.responsesCreate.mockResolvedValueOnce({
      output_text: JSON.stringify({
        analysis: {
          brandName: "DSGNFI Studio",
          positioning: "A creative digital studio for brand, marketing, and web growth.",
          audience: [],
          services: ["Digital Marketing", "Brand Design", "Web Development"],
          tone: "professional",
          notes: ["Brief was interpreted."],
        },
        page: { title: null, seoTitle: null, seoDescription: null },
        blocks: [],
      }),
    });
    const { createPagePrefillSuggestions } = await import("../src/services/adminAiPrefill");

    const suggestions = await createPagePrefillSuggestions({
      adminId: "admin-1",
      artifacts: [testArtifact()],
      page: blitHomePage,
    });

    expect(suggestions.blocks.length).toBeGreaterThanOrEqual(3);
    expect(suggestions.analysis?.services).toContain("Digital Marketing");
    expect(openAiMocks.responsesCreate).toHaveBeenCalledTimes(1);
  });
});
